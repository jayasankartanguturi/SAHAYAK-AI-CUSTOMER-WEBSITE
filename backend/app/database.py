import logging
from typing import Any, Optional
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError
from .config import settings

logger = logging.getLogger(__name__)


class InMemoryCollection:
    """Minimal MongoDB-like collection interface for fallback mode."""

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
        self._connect()

    def _connect(self):
        uri = (settings.MONGODB_URI or "").strip()
        if not uri:
            if settings.IS_PRODUCTION:
                raise RuntimeError("MONGODB_URI must be configured in production.")
            self.using_mongodb = False
            logger.info("MONGODB_URI not set; using in-memory store.")
            return

        is_srv = uri.lower().startswith("mongodb+srv://")
        timeout_ms = 5000 if (settings.IS_PRODUCTION or is_srv) else 1500
        client_kwargs: dict[str, Any] = {
            "serverSelectionTimeoutMS": timeout_ms,
            "connectTimeoutMS": timeout_ms,
            "socketTimeoutMS": 15000,
            "maxPoolSize": settings.MONGODB_MAX_POOL_SIZE,
            "minPoolSize": 2,
        }
        if not is_srv:
            client_kwargs["directConnection"] = True

        try:
            client = MongoClient(uri, **client_kwargs)
            client.admin.command("ping")
            self._client = client
            self._db = client[settings.MONGODB_DB_NAME]
            self.using_mongodb = True
            self._ensure_indexes()
            logger.info("Connected to MongoDB (pool=%s, srv=%s)", settings.MONGODB_MAX_POOL_SIZE, is_srv)
        except Exception as exc:
            self.using_mongodb = False
            if settings.IS_PRODUCTION:
                raise RuntimeError(
                    f"Fatal: MongoDB connection failed in production ({exc}). "
                    "In-memory fallback is disabled in production."
                ) from exc
            logger.info("MongoDB not reachable in development; using in-memory store.")

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
            self._db["feedback"].create_index([("user_id", ASCENDING)])
            self._db["user_preferences"].create_index([("user_id", ASCENDING)], unique=True)
        except PyMongoError as exc:
            logger.warning("Index creation warning: %s", exc)

    def collection(self, name: str) -> Any:
        if self.using_mongodb and self._db is not None:
            return self._db[name]
        if name not in self._memory_collections:
            self._memory_collections[name] = InMemoryCollection()
        return self._memory_collections[name]


db_manager = DatabaseManager()
