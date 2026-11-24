# Sahayak AI – Production Deployment Guide

Recommended architecture:
- **Frontend:** Vercel (`frontend/`)
- **Backend:** Render (`backend/`)
- **Database:** MongoDB Atlas
- **AI:** Google Gemini API (`GEMINI_API_KEY`)

---

## 1. Environment Variable Checklist

### Backend (`backend/.env` or Render Environment)
| Variable | Required | Notes |
|---|---|---|
| `ENVIRONMENT` | Yes | Set to `production` |
| `ALLOW_DEMO_MODE` | Yes | Set to `false` in production (enforces JWT) |
| `TRUST_PROXY_HEADERS` | Yes | Set to `true` behind Render/load balancer |
| `MONGODB_URI` | Yes | MongoDB Atlas SRV URI |
| `MONGODB_DB_NAME` | Yes | `sahayak_ai` |
| `JWT_SECRET` | Yes | Random string ≥ 32 chars |
| `ADMIN_API_KEY` | Yes | Random string ≥ 24 chars (for `/api/admin/knowledge/*`) |
| `GEMINI_API_KEY` | Recommended | Google AI Studio key for live Gemini 2.5 Flash & embeddings |
| `DATA_GOV_API_KEY` | Optional | Agmarknet (`api.data.gov.in`) key for live mandi prices |
| `CORS_ORIGINS` | Yes | Comma-separated Vercel URL(s), e.g. `https://sahayak-ai.vercel.app` |

### Frontend (`frontend/.env` or Vercel Environment)
| Variable | Required | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | Yes (prod) | Your Render backend API URL, e.g. `https://sahayak-ai-api.onrender.com/api` |

---

## 2. MongoDB Atlas Setup
1. Create a free M0 or dedicated cluster on MongoDB Atlas.
2. Create a database user with read/write access to `sahayak_ai`.
3. Allow Render's outbound IPs (or `0.0.0.0/0` with strong credentials) in Network Access.
4. Indexes are created automatically on FastAPI startup (`DatabaseManager._ensure_indexes()`).

---

## 3. Deploy Backend to Render
1. Connect your repository to Render using `backend/render.yaml`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Health check path: `/api/health`
5. Fill in the secret environment variables above.

---

## 4. Deploy Frontend to Vercel
1. Import the repository in Vercel with **Root Directory** set to `frontend`.
2. Framework Preset: **Vite** (`npm run build`, output directory `dist`).
3. `frontend/vercel.json` handles SPA fallback rewrites for all 24 React Router routes.
4. Set `VITE_API_BASE_URL` to `https://<your-render-service>.onrender.com/api`.

---

## 5. Troubleshooting
- **Startup fails with `Invalid production configuration`:** Check `JWT_SECRET` (≥32 chars), `ADMIN_API_KEY` (≥24 chars), `ALLOW_DEMO_MODE=false`, and `CORS_ORIGINS` (no `*`).
- **401 Unauthorized on all requests in production:** Ensure `ALLOW_DEMO_MODE=false` is intended and users sign in via `/api/auth/register` or `/api/auth/login`.
- **CORS blocked in browser:** Add the exact Vercel URL (including `https://`) to `CORS_ORIGINS` on Render.
