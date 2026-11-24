# Sahayak AI — System Architecture

## 1. Backend Architecture (`backend/app/`)
Clean layered FastAPI architecture separating HTTP routing, schemas, security, AI/RAG services, and persistence:

```text
backend/app/
├── main.py                  # App factory, middleware, CORS, error handler, /api/health
├── config.py                # Typed Settings & production startup validator
├── schemas.py               # Pydantic request/validation models
├── auth.py                  # Bcrypt hashing, JWT creation/verification & logout revocation
├── security.py              # Sliding-window rate limiter, security headers, magic-byte checks
├── logging_config.py        # Structured JSON logger with secret/credential redaction
├── database.py              # MongoDB connection pool + indexes + in-memory fallback
├── rag.py                   # Hybrid Vector RAG (Gemini embeddings + TF-IDF + profession boost)
├── gemini_service.py        # Intent classifier, smart titles, Gemini text/vision & fallbacks
├── weather_service.py       # Open-Meteo live weather integration + demo fallback
├── market_service.py        # Agmarknet (data.gov.in) integration + demo reference fallback
└── routers/
    ├── auth_router.py       # /api/auth/* & /api/account/data
    ├── chat_router.py       # /api/chat, /api/voice/assist, /api/conversations/*
    ├── media_router.py      # /api/image/analyze, /api/documents/*
    ├── services_router.py   # /api/schemes*, /api/weather, /api/market-updates, /api/emergency/alerts, /api/sources
    ├── user_data_router.py  # /api/saved-answers*, /api/notifications*, /api/reminders*, /api/support-requests*, /api/feedback, /api/profile, /api/preferences
    └── admin_router.py      # /api/admin/knowledge/* (protected by X-Admin-Key)
```

## 2. Frontend Architecture (`frontend/src/`)
Modular React + Vite + Tailwind CSS v4 architecture with lazy-loaded route code splitting:

```text
frontend/src/
├── App.jsx                  # Shell layout, ErrorBoundary, Suspense, declarative route mapping
├── routes/routeConfig.jsx   # Lazy-loaded route table for all 24 customer features
├── context/AppContext.jsx   # Global state (auth, language, profession, per-user isolated lists)
├── hooks/useSpeechRecognition.js # Reusable microphone & Web Speech API hook
├── utils/storage.js         # Per-user localStorage isolation helpers
├── services/api.js          # Centralized REST client with JWT header injection
├── locales/                 # en.json, te.json, hi.json, i18n.js, demoCards.js
├── data/                    # navItems.js (24 routes in 7 groups), mockData.js
├── components/              # Sidebar, TopNav, HomeDashboard, AuthModal, WelcomeAuthGate, ui/*
└── pages/                   # All 24 feature pages
```
