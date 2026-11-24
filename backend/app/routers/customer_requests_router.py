import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from ..auth import require_current_user
from ..config import settings
from ..database import db_manager
from ..services.b2b_sync_service import (
    retry_failed_syncs,
    sync_request_to_b2b,
    verify_signature,
)

router = APIRouter(tags=["Customer Requests & B2B Sync"])

REQUEST_CATEGORIES = (
    "Customer Support",
    "Profession-Based Service",
    "Technical Assistance",
    "Government Scheme Assistance",
    "Document Assistance",
    "Expert Consultation",
    "General Assistance",
)

REQUEST_STATUSES = (
    "Pending",
    "Under Review",
    "Accepted",
    "Assigned",
    "In Progress",
    "Waiting for Customer",
    "Resolved",
    "Rejected",
    "Closed",
)

ALLOWED_ATTACHMENT_EXTS = (".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".txt")


class AttachmentItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=180)
    url: Optional[str] = Field(default="", max_length=500)
    mimeType: Optional[str] = Field(default="", max_length=100)
    sizeBytes: Optional[int] = Field(default=0, ge=0, le=15 * 1024 * 1024)


class CustomerRequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5, max_length=4000)
    category: Literal[
        "Customer Support",
        "Profession-Based Service",
        "Technical Assistance",
        "Government Scheme Assistance",
        "Document Assistance",
        "Expert Consultation",
        "General Assistance",
    ]
    priority: Literal["Low", "Normal", "High", "Urgent"] = "Normal"
    attachments: list[AttachmentItem] = Field(default_factory=list, max_length=5)


class CustomerReplyCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class B2BWebhookUpdate(BaseModel):
    eventId: Optional[str] = None
    requestId: str = Field(..., min_length=3, max_length=80)
    status: Literal[
        "Pending",
        "Under Review",
        "Accepted",
        "Assigned",
        "In Progress",
        "Waiting for Customer",
        "Resolved",
        "Rejected",
        "Closed",
    ]
    assignedAdminId: Optional[str] = None
    assignedStaffName: Optional[str] = None
    adminResponse: Optional[str] = None
    actorName: Optional[str] = "Sahayak Admin"
    updatedAt: Optional[str] = None


def _generate_request_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    short = uuid.uuid4().hex[:6].upper()
    return f"REQ-{stamp}-{short}"


def _create_customer_notification(
    user_id: str,
    title: str,
    message: str,
    request_id: str,
    notif_type: str = "request_update",
) -> None:
    db_manager.collection("notifications").insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "request_id": request_id,
            "type": notif_type,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


def _clean_doc(doc: dict[str, Any]) -> dict[str, Any]:
    out = dict(doc)
    out.pop("_id", None)
    return out


@router.get("/api/customer-requests")
def list_my_customer_requests(
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    current_user: dict = Depends(require_current_user),
):
    query: dict[str, Any] = {"customer_id": current_user["user_id"]}
    if status:
        query["status"] = status
    if category:
        query["category"] = category

    items = list(db_manager.collection("customer_requests").find(query))
    cleaned = [_clean_doc(i) for i in reversed(items)]
    return {"items": cleaned, "total": len(cleaned)}


@router.get("/api/customer-requests/{request_id}")
def get_my_customer_request(
    request_id: str,
    current_user: dict = Depends(require_current_user),
):
    doc = db_manager.collection("customer_requests").find_one(
        {"request_id": request_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    if doc.get("customer_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only access your own requests")
    return _clean_doc(doc)


@router.post("/api/customer-requests")
def create_customer_request(
    payload: CustomerRequestCreate,
    current_user: dict = Depends(require_current_user),
):
    for att in payload.attachments:
        lower_name = att.name.lower().strip()
        if not any(lower_name.endswith(ext) for ext in ALLOWED_ATTACHMENT_EXTS):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported attachment type for '{att.name}'. Allowed: {', '.join(ALLOWED_ATTACHMENT_EXTS)}",
            )

    user_doc = db_manager.collection("users").find_one({"user_id": current_user["user_id"]}) or {}
    now = datetime.now(timezone.utc).isoformat()
    request_id = _generate_request_id()

    doc = {
        "request_id": request_id,
        "customer_id": current_user["user_id"],
        "customer_name": user_doc.get("name") or current_user.get("name") or "Customer",
        "customer_email": user_doc.get("email") or current_user.get("email") or "",
        "customer_profession": user_doc.get("profession") or "Farmer",
        "category": payload.category,
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "priority": payload.priority,
        "attachments": [att.model_dump() for att in payload.attachments],
        "status": "Pending",
        "assigned_admin_id": None,
        "assigned_staff_name": None,
        "admin_response": None,
        "responses": [],
        "status_history": [
            {
                "event_id": str(uuid.uuid4()),
                "status": "Pending",
                "note": "Request submitted by customer",
                "actor": user_doc.get("name") or current_user.get("name") or "Customer",
                "timestamp": now,
            }
        ],
        "sync_status": "pending",
        "sync_attempts": 0,
        "sync_last_error": None,
        "created_at": now,
        "updated_at": now,
    }

    db_manager.collection("customer_requests").insert_one(doc)

    _create_customer_notification(
        user_id=current_user["user_id"],
        title=f"Request {request_id} Submitted",
        message=f"Your {payload.category} request '{payload.title.strip()}' has been received and queued for review.",
        request_id=request_id,
        notif_type="request_submitted",
    )

    sync_result = sync_request_to_b2b(doc)
    refreshed = db_manager.collection("customer_requests").find_one({"request_id": request_id}) or doc
    out = _clean_doc(refreshed)
    out["sync_result"] = sync_result
    return out


@router.post("/api/customer-requests/{request_id}/reply")
def add_customer_reply(
    request_id: str,
    payload: CustomerReplyCreate,
    current_user: dict = Depends(require_current_user),
):
    col = db_manager.collection("customer_requests")
    doc = col.find_one({"request_id": request_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    if doc.get("customer_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only reply to your own requests")
    if doc.get("status") in ("Closed", "Rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot reply to a {doc['status']} request")

    now = datetime.now(timezone.utc).isoformat()
    reply_entry = {
        "event_id": str(uuid.uuid4()),
        "sender": "customer",
        "author": current_user.get("name") or "Customer",
        "message": payload.message.strip(),
        "timestamp": now,
    }

    next_status = "In Progress" if doc.get("status") == "Waiting for Customer" else doc.get("status", "Pending")
    responses = list(doc.get("responses") or []) + [reply_entry]
    history = list(doc.get("status_history") or []) + [
        {
            "event_id": reply_entry["event_id"],
            "status": next_status,
            "note": f"Customer replied: {payload.message.strip()[:120]}",
            "actor": current_user.get("name") or "Customer",
            "timestamp": now,
        }
    ]

    col.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": next_status,
                "responses": responses,
                "status_history": history,
                "last_customer_reply": payload.message.strip(),
                "updated_at": now,
                "sync_status": "pending",
            }
        },
    )
    updated = col.find_one({"request_id": request_id}) or doc
    sync_request_to_b2b(updated)
    return _clean_doc(col.find_one({"request_id": request_id}) or updated)


@router.post("/api/customer-requests/retry-sync")
def retry_my_failed_syncs(current_user: dict = Depends(require_current_user)):
    return retry_failed_syncs(customer_id=current_user["user_id"])


@router.post("/api/internal/customer-requests/webhook")
async def receive_b2b_status_webhook(
    request: Request,
    x_sahayak_timestamp: Optional[str] = Header(default=None),
    x_sahayak_signature: Optional[str] = Header(default=None),
):
    """
    Secure server-to-server webhook called by SAHAYAK-B2B Express backend whenever an admin
    updates a customer request status, assigns staff, or sends a response.
    Protected by HMAC-SHA256 signature verification.
    """
    raw_body = await request.body()
    if not verify_signature(
        raw_body=raw_body,
        timestamp=x_sahayak_timestamp,
        signature=x_sahayak_signature,
        secret=settings.INTER_SERVICE_SECRET,
    ):
        raise HTTPException(status_code=401, detail="Invalid or expired inter-service signature")

    try:
        payload = B2BWebhookUpdate.model_validate_json(raw_body)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid webhook payload: {exc}")

    col = db_manager.collection("customer_requests")
    doc = col.find_one({"request_id": payload.requestId})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Customer request {payload.requestId} not found")

    # Idempotency check: ignore duplicate webhook event deliveries
    existing_history = list(doc.get("status_history") or [])
    if payload.eventId and any(h.get("event_id") == payload.eventId for h in existing_history):
        return {"received": True, "duplicate": True, "requestId": payload.requestId}

    now = payload.updatedAt or datetime.now(timezone.utc).isoformat()
    event_id = payload.eventId or str(uuid.uuid4())
    actor = payload.actorName or "Sahayak Admin"

    responses = list(doc.get("responses") or [])
    if payload.adminResponse and payload.adminResponse.strip():
        responses.append(
            {
                "event_id": event_id,
                "sender": "admin",
                "author": actor,
                "message": payload.adminResponse.strip(),
                "timestamp": now,
            }
        )

    note_parts = [f"Status updated to {payload.status}"]
    if payload.assignedStaffName:
        note_parts.append(f"Assigned to {payload.assignedStaffName}")
    if payload.adminResponse and payload.adminResponse.strip():
        note_parts.append(payload.adminResponse.strip()[:160])

    existing_history.append(
        {
            "event_id": event_id,
            "status": payload.status,
            "note": " • ".join(note_parts),
            "actor": actor,
            "timestamp": now,
        }
    )

    updates: dict[str, Any] = {
        "status": payload.status,
        "status_history": existing_history,
        "responses": responses,
        "updated_at": now,
        "sync_status": "synced",
        "synced_at": now,
    }
    if payload.assignedAdminId is not None:
        updates["assigned_admin_id"] = payload.assignedAdminId
    if payload.assignedStaffName is not None:
        updates["assigned_staff_name"] = payload.assignedStaffName
    if payload.adminResponse and payload.adminResponse.strip():
        updates["admin_response"] = payload.adminResponse.strip()

    col.update_one({"request_id": payload.requestId}, {"$set": updates})

    # Notify customer in Customer Portal
    notif_titles = {
        "Accepted": f"Request {payload.requestId} Accepted",
        "Rejected": f"Request {payload.requestId} Rejected",
        "Assigned": f"Request {payload.requestId} Assigned",
        "In Progress": f"Work Started on {payload.requestId}",
        "Waiting for Customer": f"Action Needed on {payload.requestId}",
        "Resolved": f"Request {payload.requestId} Resolved",
        "Closed": f"Request {payload.requestId} Closed",
        "Under Review": f"Request {payload.requestId} Under Review",
    }
    notif_title = notif_titles.get(payload.status, f"Update on {payload.requestId}")
    notif_msg = (
        payload.adminResponse.strip()
        if payload.adminResponse and payload.adminResponse.strip()
        else f"Your request status is now '{payload.status}'."
        + (f" Assigned to {payload.assignedStaffName}." if payload.assignedStaffName else "")
    )
    _create_customer_notification(
        user_id=doc["customer_id"],
        title=notif_title,
        message=notif_msg,
        request_id=payload.requestId,
        notif_type=f"request_{payload.status.lower().replace(' ', '_')}",
    )

    return {
        "received": True,
        "requestId": payload.requestId,
        "status": payload.status,
        "eventId": event_id,
    }
