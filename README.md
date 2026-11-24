# Sahayak AI – AI Assistance for Every Profession

**One AI. Multiple Professions. Every Language.**

Sahayak AI is a multilingual, profession-aware citizen AI assistant built with **React + Vite + Tailwind CSS + Framer Motion + Lucide React** on the frontend and **Python FastAPI + MongoDB + PyMuPDF + Vector RAG + Gemini API + JWT** on the backend.

## Project Structure

```text
sahayak ai 2/
├── frontend/                 # React + Vite + Tailwind CSS v4
│   ├── public/images/        # Custom AI hero, govt dome & profession thumbnails
│   ├── src/
│   │   ├── components/       # Sidebar, TopNav, HomeDashboard, AuthModal, PageHeader
│   │   ├── context/          # AppContext (24-page navigation, language, profession, state)
│   │   ├── data/             # navItems (24 items in 7 groups), mockData
│   │   ├── pages/            # All 24 feature pages
│   │   └── services/         # API client with offline demo fallback
│   └── vite.config.js
└── backend/                  # FastAPI + MongoDB + PyMuPDF + RAG + Gemini
    ├── app/
    │   ├── main.py           # REST API endpoints
    │   ├── config.py         # Environment variable configuration
    │   ├── auth.py           # JWT authentication & bcrypt password hashing
    │   ├── database.py       # MongoDB client with automatic in-memory fallback
    │   ├── rag.py            # TF-IDF cosine vector RAG store
    │   └── gemini_service.py # Gemini text & vision integration
    ├── .env.example
    └── requirements.txt
```

## Quick Start

### 1. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Add your GEMINI_API_KEY and MONGODB_URI in backend/.env
uvicorn app.main:app --reload --port 8000
```

> **Note on Demo vs Live Data:** Weather forecasts, mandi prices, local service distances, and scheme snapshots are clearly labeled as demo data until live government/weather APIs are connected.

