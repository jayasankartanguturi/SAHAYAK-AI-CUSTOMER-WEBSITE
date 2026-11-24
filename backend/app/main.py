import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import db_manager
from .logging_config import configure_logging
from .rag import rag_store
from .routers import (
    admin_router,
    auth_router,
    chat_router,
    customer_requests_router,
    media_router,
    services_router,
    user_data_router,
)
from .security import SecurityHeadersAndRateLimitMiddleware

configure_logging()
logger = logging.getLogger("sahayak.api")

prod_issues = settings.validate_for_production()
if prod_issues:
    raise RuntimeError("Invalid production configuration: " + "; ".join(prod_issues))

app = FastAPI(
    title="Sahayak AI API",
    description="Multilingual AI Assistance for Every Profession — FastAPI + MongoDB + PyMuPDF + RAG + Gemini",
    version=settings.APP_VERSION,
)

app.add_middleware(SecurityHeadersAndRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server error on %s %s: %s", request.method, request.url.path, type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "mongodb_connected": db_manager.using_mongodb,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "agmarknet_configured": bool(settings.DATA_GOV_API_KEY),
        "rate_limiting": settings.RATE_LIMIT_ENABLED,
        "rag_chunks": len(rag_store.documents),
        "collections": [
            "users",
            "conversations",
            "messages",
            "documents",
            "saved_answers",
            "notifications",
            "reminders",
            "support_requests",
            "feedback",
            "user_preferences",
        ],
    }


app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(media_router.router)
app.include_router(services_router.router)
app.include_router(user_data_router.router)
app.include_router(admin_router.router)
app.include_router(customer_requests_router.router)
