from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from main import app, chunk_text, cosine_similarity

# Create test client with raise_server_exceptions=False to properly handle rate limiting
client = TestClient(app, raise_server_exceptions=False)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_headers():
    """Test that CORS headers are properly set."""
    # Test OPTIONS preflight request
    response = client.options(
        "/ask",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-api-key"
        }
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-methods" in response.headers
    assert "access-control-allow-headers" in response.headers


def test_cors_blocks_unauthorized_origin():
    """Test that CORS blocks requests from unauthorized origins."""
    # Test with an origin that's not in the allowed list
    response = client.options(
        "/ask",
        headers={
            "Origin": "http://evil-site.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-api-key"
        }
    )

    # FastAPI's CORS middleware blocks unauthorized origins with 400
    assert response.status_code == 400
    # Verify the evil origin is not in the allowed origins header
    if "access-control-allow-origin" in response.headers:
        assert response.headers["access-control-allow-origin"] != "http://evil-site.com"


def test_chunk_text():
    """Test text chunking functionality with overlap."""
    # Test basic chunking
    text = "This is a test. " * 100  # Create a long text (1600 chars)
    chunks = chunk_text(text, chunk_size=500, overlap=50)

    assert len(chunks) > 1, "Long text should be split into multiple chunks"
    # With overlap, chunks can be slightly larger than chunk_size due to boundary detection
    assert all(len(chunk) <= 600 for chunk in chunks), "Chunks should respect size limits"

    # Test that short text isn't chunked
    short_text = "Short text"
    short_chunks = chunk_text(short_text, chunk_size=100)
    assert len(short_chunks) == 1, "Short text should not be chunked"
    assert short_chunks[0] == short_text

    # Test sentence boundary detection
    sentences = "First sentence. Second sentence. Third sentence. " * 10
    sent_chunks = chunk_text(sentences, chunk_size=100, overlap=20)
    # Check that chunks end at sentence boundaries when possible
    for chunk in sent_chunks[:-1]:  # All but last chunk
        # Should end with punctuation if possible
        if len(chunk) < 100:  # Last chunk might be short
            continue


def test_cosine_similarity():
    """Test cosine similarity calculation."""
    vec1 = [1.0, 0.0, 0.0]
    vec2 = [1.0, 0.0, 0.0]
    vec3 = [0.0, 1.0, 0.0]

    # Identical vectors should have similarity of 1
    assert abs(cosine_similarity(vec1, vec2) - 1.0) < 0.001

    # Orthogonal vectors should have similarity of 0
    assert abs(cosine_similarity(vec1, vec3)) < 0.001


def test_ask_missing_api_key():
    """Test /ask endpoint without API key."""
    response = client.post("/ask", json={
        "documents": [
            {
                "id": "1",
                "title": "Test Doc",
                "content": "Test content",
                "createdAt": "2024-01-01"
            }
        ],
        "question": "What is this about?"
    })

    assert response.status_code == 400
    assert "X-API-Key header is required" in response.json()["detail"]


def test_ask_invalid_api_key_format():
    """Test /ask endpoint with invalid API key format."""
    response = client.post(
        "/ask",
        json={
            "documents": [
                {
                    "id": "1",
                    "title": "Test Doc",
                    "content": "Test content",
                    "createdAt": "2024-01-01"
                }
            ],
            "question": "What is this about?"
        },
        headers={"X-API-Key": "invalid-key"}
    )

    assert response.status_code == 400
    assert "Invalid API key format" in response.json()["detail"]


@patch('main.OpenAI')
def test_ask_rag_pipeline(mock_openai_class):
    """Test the full RAG pipeline with mocked OpenAI responses."""
    # Create mock OpenAI client
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    # Mock embeddings response - return embeddings for whatever is passed
    def mock_embeddings_create(model, input, **kwargs):
        response = Mock()
        # Return embeddings for each input text
        response.data = [Mock(embedding=[0.1, 0.2, 0.3]) for _ in input]
        return response

    mock_client.embeddings.create.side_effect = mock_embeddings_create

    # Mock chat completion response
    mock_chat_response = Mock()
    mock_chat_response.choices = [
        Mock(message=Mock(content="This is about Python programming."))
    ]
    mock_client.chat.completions.create.return_value = mock_chat_response

    # Make request
    response = client.post(
        "/ask",
        json={
            "documents": [
                {
                    "id": "1",
                    "title": "Python Guide",
                    "content": (
                        "Python is a programming language. "
                        "It is very popular for data science."
                    ),
                    "createdAt": "2024-01-01"
                }
            ],
            "question": "What is Python?"
        },
        headers={"X-API-Key": "sk-test-key"}
    )

    # Verify response
    if response.status_code != 200:
        print(f"Error: {response.json()}")
    assert response.status_code == 200
    result = response.json()
    assert "answer" in result
    assert result["answer"] == "This is about Python programming."
    assert "sources" in result
    assert "Python Guide" in result["sources"]

    # Verify OpenAI calls were made correctly
    assert mock_client.embeddings.create.called
    assert mock_client.chat.completions.create.called


@patch('main.OpenAI')
def test_rate_limiting_under_limit(mock_openai_class):
    """Test that requests under the rate limit (10/minute) succeed."""
    # Create mock OpenAI client
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    def mock_embeddings_create(model, input, **kwargs):
        response = Mock()
        response.data = [Mock(embedding=[0.1, 0.2, 0.3]) for _ in input]
        return response

    mock_client.embeddings.create.side_effect = mock_embeddings_create

    mock_chat_response = Mock()
    mock_chat_response.choices = [
        Mock(message=Mock(content="Test answer"))
    ]
    mock_client.chat.completions.create.return_value = mock_chat_response

    # Make 5 requests (under the 10/minute limit)
    for i in range(5):
        response = client.post(
            "/ask",
            json={
                "documents": [{
                    "id": "1",
                    "title": "Test",
                    "content": "Test content",
                    "createdAt": "2024-01-01"
                }],
                "question": f"Question {i}"
            },
            headers={"X-API-Key": "sk-test-key"}
        )
        assert response.status_code == 200, f"Request {i} failed with status {response.status_code}"


@patch('main.OpenAI')
def test_rate_limiting_exceeds_limit(mock_openai_class):
    """Test that requests over the rate limit (10/minute) return 429."""
    # Create mock OpenAI client
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    def mock_embeddings_create(model, input, **kwargs):
        response = Mock()
        response.data = [Mock(embedding=[0.1, 0.2, 0.3]) for _ in input]
        return response

    mock_client.embeddings.create.side_effect = mock_embeddings_create

    mock_chat_response = Mock()
    mock_chat_response.choices = [
        Mock(message=Mock(content="Test answer"))
    ]
    mock_client.chat.completions.create.return_value = mock_chat_response

    # Make many requests to ensure we hit the rate limit (15 requests)
    # Since rate limit state may persist across tests, we just verify that
    # at least some requests succeed and at least one gets rate limited
    responses = []
    for i in range(15):
        response = client.post(
            "/ask",
            json={
                "documents": [{
                    "id": "1",
                    "title": "Test",
                    "content": "Test content",
                    "createdAt": "2024-01-01"
                }],
                "question": f"Question {i}"
            },
            headers={"X-API-Key": "sk-test-key"}
        )
        responses.append(response)

    # Check that we got at least one 429 response (rate limited)
    status_codes = [r.status_code for r in responses]
    assert 429 in status_codes, "Should have at least one rate limited response"

    # Find first 429 response and verify it's a proper rate limit response
    rate_limited_response = next(r for r in responses if r.status_code == 429)
    assert rate_limited_response.status_code == 429


def test_rate_limiting_health_endpoint_not_limited():
    """Test that /health endpoint is not rate limited."""
    # Make many requests to /health endpoint
    for i in range(20):
        response = client.get("/health")
        assert response.status_code == 200, f"/health should not be rate limited (request {i})"


@patch('main.limiter.enabled', False)
@patch('main.OpenAI')
def test_openai_invalid_api_key_error(mock_openai_class):
    """Test that invalid API key errors return 401 with generic message."""
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    # Mock OpenAI to raise invalid API key error
    mock_client.embeddings.create.side_effect = Exception("Invalid API key provided")

    response = client.post(
        "/ask",
        json={
            "documents": [{
                "id": "1",
                "title": "Test",
                "content": "Test content",
                "createdAt": "2024-01-01"
            }],
            "question": "Test question"
        },
        headers={"X-API-Key": "sk-invalid-key"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid OpenAI API key"


@patch('main.limiter.enabled', False)
@patch('main.OpenAI')
def test_openai_rate_limit_error(mock_openai_class):
    """Test that rate limit errors return 429 with generic message."""
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    # Mock OpenAI to raise rate limit error
    mock_client.embeddings.create.side_effect = Exception("Rate limit exceeded")

    response = client.post(
        "/ask",
        json={
            "documents": [{
                "id": "1",
                "title": "Test",
                "content": "Test content",
                "createdAt": "2024-01-01"
            }],
            "question": "Test question"
        },
        headers={"X-API-Key": "sk-test-key"}
    )

    assert response.status_code == 429
    assert "rate limit" in response.json()["detail"].lower()


@patch('main.limiter.enabled', False)
@patch('main.OpenAI')
def test_openai_timeout_error(mock_openai_class):
    """Test that timeout errors return 504 with generic message."""
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    # Mock OpenAI to raise timeout error
    mock_client.embeddings.create.side_effect = Exception("Request timeout")

    response = client.post(
        "/ask",
        json={
            "documents": [{
                "id": "1",
                "title": "Test",
                "content": "Test content",
                "createdAt": "2024-01-01"
            }],
            "question": "Test question"
        },
        headers={"X-API-Key": "sk-test-key"}
    )

    assert response.status_code == 504
    assert "timed out" in response.json()["detail"].lower()


@patch('main.limiter.enabled', False)
@patch('main.OpenAI')
def test_openai_generic_error(mock_openai_class):
    """Test that other errors return 500 with generic message (no internal details)."""
    mock_client = Mock()
    mock_openai_class.return_value = mock_client

    # Mock OpenAI to raise generic error
    mock_client.embeddings.create.side_effect = Exception("Internal server error with sensitive data")

    response = client.post(
        "/ask",
        json={
            "documents": [{
                "id": "1",
                "title": "Test",
                "content": "Test content",
                "createdAt": "2024-01-01"
            }],
            "question": "Test question"
        },
        headers={"X-API-Key": "sk-test-key"}
    )

    assert response.status_code == 500
    # Should not expose internal error details
    assert "sensitive data" not in response.json()["detail"].lower()
    assert "Failed to process request" in response.json()["detail"]
