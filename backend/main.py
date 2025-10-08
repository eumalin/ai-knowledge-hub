from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI

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

        # Simple GPT completion test
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that answers questions about documents."
                },
                {
                    "role": "user",
                    "content": f"Question: {request.question}\n\nDocuments:\n" +
                               "\n\n".join([f"Title: {doc.title}\nContent: {doc.content}" for doc in request.documents])
                }
            ],
            max_tokens=500,
            temperature=0.7
        )

        answer = response.choices[0].message.content
        doc_titles = [doc.title for doc in request.documents]

        return AskResponse(
            answer=answer,
            sources=doc_titles
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