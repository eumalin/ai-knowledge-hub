# AI-Powered Knowledge Q&A Platform

![CI](https://github.com/eumalin/ai-knowledge-hub/actions/workflows/ci.yml/badge.svg)

A simple, secure AI Q&A platform. Paste your documents, ask questions, and get intelligent AI responses using your own OpenAI API key.

<img width="882" height="1109" alt="image" src="https://github.com/user-attachments/assets/4ea5f772-cf7f-4f97-83ab-4454aa3b2466" />

## 🚀 Features
- **Client-side document management** - Paste text documents, stored locally in browser
- **AI-powered Q&A** - Ask questions, get context-aware answers using RAG (Retrieval-Augmented Generation)
- **User-provided API keys** - Bring your own OpenAI API key, stored securely in browser
- **Chat interface** - Conversational UI with message history
- **Responsive design** - Works seamlessly on desktop and mobile
- **Privacy-focused** - No backend storage, no user accounts, your data stays local

## 🛠 Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
  - Client-side storage (localStorage)
  - User-provided API key handling
- **Backend**: FastAPI, Python 3.11+ (stateless)
  - RAG pipeline (embeddings + similarity search + GPT)
  - Rate limiting for abuse prevention
- **AI**: OpenAI embeddings + GPT-4 (user's API key)
- **Deployment**: Vercel (frontend), Render (backend)
- **CI/CD**: GitHub Actions

## 🏗 Architecture

**Simplified MVP Design:**
- ✅ No database - documents stored client-side only
- ✅ No file uploads - text input only
- ✅ Stateless backend - only processes AI requests

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- OpenAI API key (get one at https://platform.openai.com)

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Linting
ruff check .

# Tests
pytest
```
