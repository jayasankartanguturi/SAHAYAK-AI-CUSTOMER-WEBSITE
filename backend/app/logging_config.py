import json
import logging
import re
import sys
from datetime import datetime, timezone

from .config import settings

# Patterns that must never reach log output.
_REDACTIONS = [
    (re.compile(r"(Bearer\s+)[A-Za-z0-9\-_\.]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(api-key=|api_key=|key=)[^&\s'\"]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(password[\"']?\s*[:=]\s*[\"']?)[^\"'\s,}]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"AIza[0-9A-Za-z\-_]{20,}"), "[REDACTED_GOOGLE_KEY]"),
    (re.compile(r"mongodb(\+srv)?://[^@\s]+@", re.IGNORECASE), "mongodb://[REDACTED]@"),
]


def redact(text: str) -> str:
    for pattern, repl in _REDACTIONS:
        text = pattern.sub(repl, text)
    return text


class JsonFormatter(logging.Formatter):
    """Structured JSON log lines with secret redaction."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": redact(record.getMessage()),
        }
        for key in ("request_id", "method", "path", "status", "duration_ms", "event"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exc_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    root = logging.getLogger()
    if getattr(root, "_sahayak_configured", False):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.handlers = [handler]
    root.setLevel(settings.LOG_LEVEL)
    # Silence noisy third-party request logging that may include URLs with query keys.
    for noisy in ("httpx", "httpcore", "httpx2", "httpcore2", "pymongo"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    root._sahayak_configured = True
