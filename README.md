# AI-Powered Knowledge Collaboration Platform

A full-stack AI-powered platform for collaborative knowledge management. Upload documents, ask questions, and get intelligent responses powered by AI.

## 🚀 Features
- Document upload and management
- AI-powered Q&A using OpenAI embeddings
- Multi-document querying
- User authentication with JWT
- Real-time chat interface
- Responsive design

## 🛠 Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: FastAPI, Python 3.11+, PostgreSQL
- **AI**: OpenAI embeddings, GPT for Q&A
- **Deployment**: Vercel (frontend), Render (backend)
- **CI/CD**: GitHub Actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (for production)

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
```
