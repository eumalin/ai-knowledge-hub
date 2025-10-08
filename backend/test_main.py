from fastapi.testclient import TestClient
from main import app, chunk_text, cosine_similarity
from unittest.mock import Mock, patch
import numpy as np

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chunk_text():
    """Test text chunking functionality."""
    text = "This is a test. " * 100  # Create a long text
    chunks = chunk_text(text, chunk_size=100)

    assert len(chunks) > 1
    assert all(len(chunk) <= 150 for chunk in chunks)  # Allow some overflow for word boundaries


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
    def mock_embeddings_create(model, input):
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
                    "content": "Python is a programming language. It is very popular for data science.",
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