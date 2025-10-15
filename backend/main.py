import os

import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS to allow requests from frontend
allowed_origins = [
    "http://localhost:5173",           # Local dev
    "http://127.0.0.1:5173",           # Local dev (alternative)
]

# Add production frontend URL from environment variable
# Set FRONTEND_URL in Render to your exact Vercel deployment URL
# e.g., https://your-app.vercel.app
if frontend_url := os.getenv("FRONTEND_URL"):
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> list[str]:
    """
    Split text into overlapping chunks for better context preservation.

    Args:
        text: Text to split
        chunk_size: Target size for each chunk (default 1000 chars, optimized for embeddings)
        overlap: Number of characters to overlap between chunks (default 100)

    Returns:
        List of text chunks with overlap
    """
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(text):
        # Find end position
        end = min(start + chunk_size, len(text))

        # If not at the very end, try to break at sentence or word boundary
        if end < len(text):
            # Look for sentence boundary (. ! ?) in the last portion
            sentence_end = text.rfind(". ", start, end)
            if sentence_end == -1:
                sentence_end = text.rfind("! ", start, end)
            if sentence_end == -1:
                sentence_end = text.rfind("? ", start, end)

            # If found sentence boundary in reasonable range, use it
            if sentence_end > start + chunk_size // 2:
                end = sentence_end + 1
            else:
                # Otherwise, break at word boundary
                space_pos = text.rfind(" ", start, end)
                if space_pos > start:
                    end = space_pos

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Move to next position
        # If we're at the end, break; otherwise advance with overlap
        if end >= len(text):
            break

        # Ensure we make progress even with overlap
        next_start = max(end - overlap, start + 1)
        start = next_start

    return chunks


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a_np = np.array(a)
    b_np = np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))


def get_embeddings(client: OpenAI, texts: list[str]) -> list[list[float]]:
    """Get embeddings for a list of texts using OpenAI."""
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=texts,
        timeout=30.0  # 30 second timeout
    )
    return [item.embedding for item in response.data]


def find_relevant_chunks(
    client: OpenAI,
    documents: list["Document"],
    question: str,
    top_k: int = 3
) -> list[tuple[str, str, float]]:
    """
    Find the most relevant chunks from documents for the given question.
    Returns list of (doc_title, chunk_text, similarity_score) tuples.
    """
    # Chunk all documents
    all_chunks = []
    chunk_metadata = []  # (doc_title, chunk_text)

    for doc in documents:
        chunks = chunk_text(doc.content)
        for chunk in chunks:
            all_chunks.append(chunk)
            chunk_metadata.append((doc.title, chunk))

    # Get embeddings for question and all chunks
    question_embedding = get_embeddings(client, [question])[0]
    chunk_embeddings = get_embeddings(client, all_chunks)

    # Calculate similarities
    similarities = []
    for i, chunk_emb in enumerate(chunk_embeddings):
        similarity = cosine_similarity(question_embedding, chunk_emb)
        doc_title, chunk_content = chunk_metadata[i]
        similarities.append((doc_title, chunk_content, similarity))

    # Sort by similarity and return top_k
    similarities.sort(key=lambda x: x[2], reverse=True)
    return similarities[:top_k]


class Document(BaseModel):
    id: str
    title: str
    content: str
    createdAt: str


class AskRequest(BaseModel):
    documents: list[Document]
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[str]


@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
@limiter.limit("10/minute")
async def ask_question(
    data: AskRequest,
    request: Request,
    x_api_key: str | None = Header(None, alias="X-API-Key")
):
    """
    Ask questions about documents using OpenAI.
    Requires user's OpenAI API key passed via X-API-Key header.
    Rate limited to 10 requests per minute per IP address.
    """
    # Validate API key
    if not x_api_key:
        raise HTTPException(
            status_code=400,
            detail="X-API-Key header is required"
        )

    if not x_api_key.startswith("sk-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid API key format. Must start with 'sk-'"
        )

    # Initialize OpenAI client with user's API key
    try:
        client = OpenAI(api_key=x_api_key)

        # Find relevant chunks using embeddings and similarity search
        relevant_chunks = find_relevant_chunks(
            client=client,
            documents=data.documents,
            question=data.question,
            top_k=3
        )

        # Build context from relevant chunks
        context = "\n\n".join([
            f"From '{title}':\n{chunk}"
            for title, chunk, score in relevant_chunks
        ])

        # Generate answer using GPT with relevant context
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant that answers questions "
                        "based on the provided document excerpts. "
                        "Only use information from the provided context to answer questions."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Context:\n{context}\n\nQuestion: {data.question}\n\n"
                        "Please answer the question based only on the context provided above."
                    )
                }
            ],
            max_tokens=500,
            temperature=0.7,
            timeout=30.0  # 30 second timeout
        )

        answer = response.choices[0].message.content

        # Get unique document titles from relevant chunks
        sources = list({title for title, _, _ in relevant_chunks})

        return AskResponse(
            answer=answer,
            sources=sources
        )

    except Exception as e:
        # Handle OpenAI errors with generic messages (don't expose internal details)
        error_message = str(e).lower()
        if "incorrect api key" in error_message or "invalid api key" in error_message:
            raise HTTPException(
                status_code=401,
                detail="Invalid OpenAI API key"
            ) from e
        if "rate limit" in error_message or "quota" in error_message:
            raise HTTPException(
                status_code=429,
                detail="API rate limit exceeded. Please try again later."
            ) from e
        if "timeout" in error_message:
            raise HTTPException(
                status_code=504,
                detail="Request timed out. Please try again."
            ) from e
        # Generic error message for all other failures
        raise HTTPException(
            status_code=500,
            detail="Failed to process request. Please check your API key and try again."
        ) from e

