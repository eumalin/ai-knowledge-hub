from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()


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
async def ask_question(request: AskRequest):
    """
    Basic stub endpoint for asking questions about documents.
    Currently returns a simple echo response for testing.
    """
    # Echo response for testing
    doc_titles = [doc.title for doc in request.documents]

    return AskResponse(
        answer=f"Received question: '{request.question}' about {len(request.documents)} document(s).",
        sources=doc_titles
    )