import logging
import time
import uuid
from collections import defaultdict, deque
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings

logger = logging.getLogger("sahayak.security")


class InMemoryRateLimiter:
    """Sliding-window per-client rate limiter for Auth, AI, and general routes."""

    def __init__(self):
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds
        bucket = self._hits[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            return False, retry_after
        bucket.append(now)
        return True, 0


rate_limiter = InMemoryRateLimiter()


def _client_ip(request: Request) -> str:
    if settings.TRUST_PROXY_HEADERS:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class SecurityHeadersAndRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        req_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()
        path = request.url.path

        if settings.RATE_LIMIT_ENABLED and path.startswith("/api/") and path != "/api/health":
            ip = _client_ip(request)
            if path.startswith("/api/auth/"):
                bucket, limit = f"auth:{ip}", settings.RATE_LIMIT_AUTH_PER_MINUTE
            elif path in ("/api/chat", "/api/image/analyze", "/api/voice/assist", "/api/translate") or path.startswith("/api/documents"):
                bucket, limit = f"ai:{ip}", settings.RATE_LIMIT_AI_PER_MINUTE
            else:
                bucket, limit = f"api:{ip}", settings.RATE_LIMIT_DEFAULT_PER_MINUTE

            allowed, retry_after = rate_limiter.check(bucket, limit)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": str(retry_after)},
                )

        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        response.headers["X-Request-ID"] = req_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), payment=()"

        logger.info(
            "%s %s -> %s (%sms)",
            request.method,
            path,
            response.status_code,
            duration_ms,
            extra={
                "request_id": req_id,
                "method": request.method,
                "path": path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response


def detect_image_mime_type(data: bytes) -> str | None:
    """Detects supported image MIME type strictly from file header magic bytes."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    return None


def validate_image_magic_bytes(data: bytes, content_type: str) -> bool:
    """Verifies file header magic bytes match declared image MIME type."""
    normalized = (content_type or "").split(";")[0].strip().lower()
    if normalized == "image/jpg":
        normalized = "image/jpeg"
    detected = detect_image_mime_type(data)
    return detected is not None and detected == normalized


def validate_pdf_magic_bytes(data: bytes) -> bool:
    return data.lstrip().startswith(b"%PDF-")
