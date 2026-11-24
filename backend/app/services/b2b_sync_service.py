import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from ..config import settings
from ..database import db_manager

logger = logging.getLogger(__name__)


def sign_payload(raw_body: bytes, timestamp: str, secret: str) -> str:
    msg = f"{timestamp}.".encode("utf-8") + raw_body
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def verify_signature(
    raw_body: bytes,
    timestamp: str | None,
    signature: str | None,
    secret: str,
    max_age_seconds: int = 300,
) -> bool:
    if not timestamp or not signature or not secret:
        return False
    try:
        ts_int = int(timestamp)
    except ValueError:
        return False
    if abs(int(time.time()) - ts_int) > max_age_seconds:
        return False
    expected = sign_payload(raw_body, timestamp, secret)
    return hmac.compare_digest(expected, signature.strip())


def build_sync_payload(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "requestId": doc["request_id"],
        "customerId": doc["customer_id"],
        "customerName": doc.get("customer_name", "Customer"),
        "customerEmail": doc.get("customer_email", ""),
        "customerProfession": doc.get("customer_profession", "General Citizen"),
        "category": doc["category"],
        "title": doc["title"],
        "description": doc["description"],
        "priority": doc.get("priority", "Normal"),
        "attachments": doc.get("attachments") or [],
        "status": doc.get("status", "Pending"),
        "customerReply": doc.get("last_customer_reply"),
        "createdAt": doc.get("created_at"),
        "updatedAt": doc.get("updated_at"),
    }


def sync_request_to_b2b(doc: dict[str, Any], max_attempts: int = 2) -> dict[str, Any]:
    """
    Synchronizes a CustomerRequest from FastAPI/MongoDB to SAHAYAK-B2B Express/PostgreSQL
    using HMAC-SHA256 server-to-server authentication. Records sync status and errors
    in MongoDB so failed syncs can be safely retried without creating duplicates.
    """
    url = f"{settings.B2B_API_BASE_URL}/api/internal/customer-requests/sync"
    payload = build_sync_payload(doc)
    raw_body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

    attempts = int(doc.get("sync_attempts", 0))
    last_error = None

    for attempt in range(max_attempts):
        attempts += 1
        timestamp = str(int(time.time()))
        signature = sign_payload(raw_body, timestamp, settings.INTER_SERVICE_SECRET)
        headers = {
            "Content-Type": "application/json",
            "X-Sahayak-Source": "sahayak-customer-fastapi",
            "X-Sahayak-Timestamp": timestamp,
            "X-Sahayak-Signature": signature,
        }
        try:
            with httpx.Client(timeout=settings.SYNC_TIMEOUT_SECONDS) as client:
                resp = client.post(url, content=raw_body, headers=headers)
            if 200 <= resp.status_code < 300:
                now = datetime.now(timezone.utc).isoformat()
                db_manager.collection("customer_requests").update_one(
                    {"request_id": doc["request_id"]},
                    {
                        "$set": {
                            "sync_status": "synced",
                            "sync_attempts": attempts,
                            "sync_last_error": None,
                            "synced_at": now,
                        }
                    },
                )
                return {"synced": True, "attempts": attempts, "synced_at": now}
            last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
            logger.warning("B2B sync failed for %s: %s", doc["request_id"], last_error)
        except Exception as exc:
            last_error = str(exc)[:240]
            logger.warning("B2B sync exception for %s (attempt %d): %s", doc["request_id"], attempt + 1, last_error)

    now = datetime.now(timezone.utc).isoformat()
    db_manager.collection("customer_requests").update_one(
        {"request_id": doc["request_id"]},
        {
            "$set": {
                "sync_status": "failed",
                "sync_attempts": attempts,
                "sync_last_error": last_error,
                "last_sync_attempt_at": now,
            }
        },
    )
    return {"synced": False, "attempts": attempts, "error": last_error}


def retry_failed_syncs(customer_id: str | None = None) -> dict[str, Any]:
    col = db_manager.collection("customer_requests")
    query: dict[str, Any] = {"sync_status": {"$ne": "synced"}}
    if customer_id:
        query["customer_id"] = customer_id

    pending_docs = list(col.find(query))
    synced_count = 0
    failed_count = 0
    for doc in pending_docs:
        result = sync_request_to_b2b(doc, max_attempts=1)
        if result.get("synced"):
            synced_count += 1
        else:
            failed_count += 1

    return {
        "checked": len(pending_docs),
        "synced": synced_count,
        "failed": failed_count,
    }
