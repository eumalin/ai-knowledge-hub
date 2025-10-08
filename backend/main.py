from __future__ import annotations

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Tuple
from openai import OpenAI
import numpy as np

app = FastAPI()


def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    """Split text into chunks of roughly chunk_size characters."""
    words = text.split()
    chunks = []
    current_chunk = []
    current_size = 0

    for word in words:
        word_size = len(word) + 1  # +1 for space
        if current_size + word_size > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_size = word_size
        else:
            current_chunk.append(word)
            current_size += word_size

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a_np = np.array(a)
    b_np = np.array(b)
    return float(np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np)))


def get_embeddings(client: OpenAI, texts: List[str]) -> List[List[float]]:
    """Get embeddings for a list of texts using OpenAI."""
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=texts
    )
    return [item.embedding for item in response.data]


def find_relevant_chunks(
    client: OpenAI,
    documents: List[Document],
    question: str,
    top_k: int = 3
) -> List[Tuple[str, str, float]]:
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
    documents: List[Document]
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: List[str]


@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    """
    Ask questions about documents using OpenAI.
    Requires user's OpenAI API key passed via X-API-Key header.
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
            documents=request.documents,
            question=request.question,
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
                    "content": "You are a helpful assistant that answers questions based on the provided document excerpts. "
                               "Only use information from the provided context to answer questions."
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {request.question}\n\n"
                               "Please answer the question based only on the context provided above."
                }
            ],
            max_tokens=500,
            temperature=0.7
        )

        answer = response.choices[0].message.content

        # Get unique document titles from relevant chunks
        sources = list(set([title for title, _, _ in relevant_chunks]))

        return AskResponse(
            answer=answer,
            sources=sources
        )

    except Exception as e:
        # Handle OpenAI errors
        error_message = str(e)
        if "incorrect API key" in error_message.lower() or "invalid" in error_message.lower():
            raise HTTPException(
                status_code=401,
                detail="Invalid OpenAI API key"
            )
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API error: {error_message}"
        )