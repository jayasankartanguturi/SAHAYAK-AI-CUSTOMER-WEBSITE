import logging
import re
import time
from typing import Any, Optional
from urllib.parse import urlparse

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError

from .config import settings

try:
    import certifi
except ImportError:
    certifi = None

logger = logging.getLogger("sahayak.database")

_CRED_MASK_RE = re.compile(r"(mongodb(?:\+srv)?://)([^/@]+)@", re.IGNORECASE)


def _sanitize_error_text(text: str) -> str:
    """Strips any MongoDB credentials from error messages before logging or exposing."""
    cleaned = _CRED_MASK_RE.sub(r"\1***:***@", str(text or ""))
    return cleaned[:260]


def _normalize_mongo_uri(raw: str) -> str:
    uri = (raw or "").strip()
    if len(uri) >= 2 and uri[0] == uri[-1] and uri[0] in ("'", '"'):
        uri = uri[1:-1].strip()
    return uri


def _describe_uri_safely(uri: str) -> tuple[str, str]:
    """Returns (scheme, host) without ever exposing username or password."""
    if not uri:
        return ("none", "")
    try:
        parsed = urlparse(uri)
        scheme = (parsed.scheme or "unknown").lower()
        host = parsed.hostname or ""
        return (scheme, host)
    except Exception:
        return ("invalid", "")


class InMemoryCollection:
    """Minimal MongoDB-like collection interface for development fallback mode."""

    def __init__(self, initial_docs: Optional[list[dict]] = None):
        self._docs: list[dict] = list(initial_docs or [])

    def find(self, query: Optional[dict] = None) -> list[dict]:
        if not query:
            return [dict(d) for d in self._docs]
        return [dict(d) for d in self._docs if all(d.get(k) == v for k, v in query.items())]

    def find_one(self, query: dict) -> Optional[dict]:
        for doc in self._docs:
            if all(doc.get(k) == v for k, v in query.items()):
                return dict(doc)
        return None

    def insert_one(self, doc: dict) -> dict:
        stored = dict(doc)
        self._docs.append(stored)
        return stored

    def update_one(self, query: dict, update: dict, upsert: bool = False) -> bool:
        for i, doc in enumerate(self._docs):
            if all(doc.get(k) == v for k, v in query.items()):
                if "$set" in update:
                    self._docs[i].update(update["$set"])
                return True
        if upsert and "$set" in update:
            new_doc = dict(query)
            new_doc.update(update["$set"])
            self._docs.append(new_doc)
            return True
        return False

    def delete_one(self, query: dict) -> int:
        for i, doc in enumerate(self._docs):
            if all(doc.get(k) == v for k, v in query.items()):
                self._docs.pop(i)
                return 1
        return 0

    def delete_many(self, query: dict) -> int:
        before = len(self._docs)
        self._docs = [
            d for d in self._docs if not all(d.get(k) == v for k, v in query.items())
        ]
        return before - len(self._docs)


class DatabaseManager:
    def __init__(self):
        self.using_mongodb = False
        self._client: Optional[MongoClient] = None
        self._db: Any = None
        self._memory_collections: dict[str, InMemoryCollection] = {}
        self.uri_scheme: str = "none"
        self.uri_host: str = ""
        self.last_error_type: Optional[str] = None
        self.last_error_summary: Optional[str] = None
        self._last_attempt_ts: float = 0.0
        self._connect(raise_in_prod=True)

    def _connect(self, raise_in_prod: bool = False):
        self._last_attempt_ts = time.time()
        uri = _normalize_mongo_uri(settings.MONGODB_URI)
        self.uri_scheme, self.uri_host = _describe_uri_safely(uri)

        if not uri:
            self.using_mongodb = False
            self.last_error_type = "ConfigurationError"
            self.last_error_summary = "MONGODB_URI is empty or not set."
            if settings.IS_PRODUCTION and raise_in_prod:
                raise RuntimeError("MONGODB_URI must be configured in production.")
            logger.warning("MongoDB connection skipped: %s", self.last_error_summary)
            return

        if "<" in uri or ">" in uri:
            self.using_mongodb = False
            self.last_error_type = "ConfigurationError"
            self.last_error_summary = (
                "MONGODB_URI contains angle brackets (< or >). Remove < > around username and password."
            )
            logger.error("MongoDB configuration error: %s", self.last_error_summary)
            if settings.IS_PRODUCTION and raise_in_prod:
                raise RuntimeError(self.last_error_summary)
            return

        is_srv = uri.lower().startswith("mongodb+srv://")
        timeout_ms = 15000 if (settings.IS_PRODUCTION or is_srv) else 2000
        client_kwargs: dict[str, Any] = {
            "serverSelectionTimeoutMS": timeout_ms,
            "connectTimeoutMS": timeout_ms,
            "socketTimeoutMS": 20000,
            "maxPoolSize": settings.MONGODB_MAX_POOL_SIZE,
            "minPoolSize": 1,
            "retryWrites": True,
        }
        if is_srv:
            client_kwargs["tls"] = True
            if certifi is not None:
                client_kwargs["tlsCAFile"] = certifi.where()
        else:
            client_kwargs["directConnection"] = True

        try:
            client = MongoClient(uri, **client_kwargs)
            client.admin.command("ping")
            self._client = client
            self._db = client[settings.MONGODB_DB_NAME]
            self.using_mongodb = True
            self.last_error_type = None
            self.last_error_summary = None
            self._ensure_indexes()
            logger.info(
                "Connected to MongoDB (db=%s, scheme=%s, host=%s, pool=%s)",
                settings.MONGODB_DB_NAME,
                self.uri_scheme,
                self.uri_host,
                settings.MONGODB_MAX_POOL_SIZE,
            )
        except Exception as exc:
            self.using_mongodb = False
            self.last_error_type = type(exc).__name__
            self.last_error_summary = f"{type(exc).__name__}: {_sanitize_error_text(str(exc))}"
            logger.error(
                "MongoDB connection failed (scheme=%s, host=%s): %s",
                self.uri_scheme,
                self.uri_host,
                self.last_error_summary,
            )
            if settings.IS_PRODUCTION and raise_in_prod:
                raise RuntimeError(
                    f"Fatal: MongoDB connection failed in production ({self.last_error_summary}). "
                    "In-memory fallback is disabled in production."
                ) from exc

    def ping_or_reconnect(self) -> bool:
        """Verifies live MongoDB health and retries connection safely (throttled every 15s)."""
        if self.using_mongodb and self._client is not None:
            try:
                self._client.admin.command("ping")
                return True
            except Exception as exc:
                self.using_mongodb = False
                self.last_error_type = type(exc).__name__
                self.last_error_summary = f"{type(exc).__name__}: {_sanitize_error_text(str(exc))}"
                logger.warning("MongoDB ping failed: %s", self.last_error_summary)

        if (time.time() - self._last_attempt_ts) >= 15.0:
            self._connect(raise_in_prod=False)
        return self.using_mongodb

    def _ensure_indexes(self):
        if not self.using_mongodb or self._db is None:
            return
        try:
            self._db["users"].create_index([("email", ASCENDING)], unique=True)
            self._db["users"].create_index([("user_id", ASCENDING)], unique=True)
            self._db["conversations"].create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
            self._db["conversations"].create_index([("id", ASCENDING)], unique=True)
            self._db["messages"].create_index([("conversation_id", ASCENDING), ("user_id", ASCENDING), ("created_at", ASCENDING)])
            self._db["documents"].create_index([("user_id", ASCENDING), ("uploaded_at", DESCENDING)])
            self._db["saved_answers"].create_index([("user_id", ASCENDING), ("saved_at", DESCENDING)])
            self._db["notifications"].create_index([("user_id", ASCENDING)])
            self._db["reminders"].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
            self._db["support_requests"].create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
            self._db["customer_requests"].create_index([("request_id", ASCENDING)], unique=True)
            self._db["customer_requests"].create_index([("customer_id", ASCENDING), ("created_at", DESCENDING)])
            self._db["revoked_tokens"].create_index([("jti", ASCENDING)], unique=True)
            self._db["revoked_tokens"].create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
            self._db["agriculture_prices"].create_index(
                [("state", ASCENDING), ("market", ASCENDING), ("commodity", ASCENDING), ("variety", ASCENDING), ("reported_date", ASCENDING)],
                unique=True,
            )
            self._db["feedback"].create_index([("user_id", ASCENDING)])
            self._db["user_preferences"].create_index([("user_id", ASCENDING)], unique=True)
        except PyMongoError as exc:
            logger.warning("Index creation warning: %s", _sanitize_error_text(str(exc)))

    def collection(self, name: str) -> Any:
        if self.using_mongodb and self._db is not None:
            return self._db[name]
        if name not in self._memory_collections:
            self._memory_collections[name] = InMemoryCollection()
        return self._memory_collections[name]


db_manager = DatabaseManager()
