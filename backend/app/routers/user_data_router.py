import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import db_manager
from ..schemas import (
    FeedbackCreate,
    OnboardingUpdate,
    PreferencesUpdate,
    ProfileUpdate,
    ReminderCreate,
    SavedAnswerRequest,
    SupportRequestCreate,
)

router = APIRouter(tags=["User Activity, Support & Profile"])


@router.get("/api/saved-answers")
def list_saved_answers(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    items = list(db_manager.collection("saved_answers").find({"user_id": current_user["user_id"]}))
    for i in items:
        i.pop("_id", None)
    ordered = list(reversed(items))
    return {"items": ordered[offset : offset + limit], "total": len(ordered)}


@router.post("/api/saved-answers")
def save_answer(payload: SavedAnswerRequest, current_user: dict = Depends(get_current_user)):
    item = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "title": payload.title,
        "content": payload.content,
        "category": payload.category,
        "source": payload.source,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    db_manager.collection("saved_answers").insert_one(item)
    item.pop("_id", None)
    return item


@router.delete("/api/saved-answers/{item_id}")
def delete_saved_answer(item_id: str, current_user: dict = Depends(get_current_user)):
    deleted = db_manager.collection("saved_answers").delete_one(
        {"id": item_id, "user_id": current_user["user_id"]}
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Saved answer not found")
    return {"deleted": True}


@router.get("/api/notifications")
def list_notifications(current_user: dict = Depends(get_current_user)):
    col = db_manager.collection("notifications")
    items = list(col.find({"user_id": current_user["user_id"]}))
    for i in items:
        i.pop("_id", None)
    return {"items": list(reversed(items))}


@router.patch("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    updated = db_manager.collection("notifications").update_one(
        {"id": notif_id, "user_id": current_user["user_id"]},
        {"$set": {"read": True}},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"updated": True}


@router.get("/api/reminders")
def list_reminders(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    items = list(db_manager.collection("reminders").find({"user_id": current_user["user_id"]}))
    for i in items:
        i.pop("_id", None)
    ordered = list(reversed(items))
    return {"items": ordered[offset : offset + limit], "total": len(ordered)}


@router.post("/api/reminders")
def create_reminder(payload: ReminderCreate, current_user: dict = Depends(get_current_user)):
    reminder = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "title": payload.title,
        "detail": payload.detail,
        "due_date": payload.due_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db_manager.collection("reminders").insert_one(reminder)
    reminder.pop("_id", None)
    return reminder


@router.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    deleted = db_manager.collection("reminders").delete_one(
        {"id": reminder_id, "user_id": current_user["user_id"]}
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"deleted": True}


@router.get("/api/support-requests")
def list_support_requests(current_user: dict = Depends(get_current_user)):
    items = list(db_manager.collection("support_requests").find({"user_id": current_user["user_id"]}))
    for i in items:
        i.pop("_id", None)
    return {"items": list(reversed(items))}


@router.post("/api/support-requests")
def create_support_request(payload: SupportRequestCreate, current_user: dict = Depends(get_current_user)):
    ticket = {
        "id": f"SR-{str(uuid.uuid4())[:6].upper()}",
        "user_id": current_user["user_id"],
        "subject": payload.subject,
        "category": payload.category,
        "description": payload.description,
        "priority": payload.priority,
        "status": "Open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db_manager.collection("support_requests").insert_one(ticket)
    ticket.pop("_id", None)
    return ticket


@router.post("/api/feedback")
def submit_feedback(payload: FeedbackCreate, current_user: dict = Depends(get_current_user)):
    record = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        **payload.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db_manager.collection("feedback").insert_one(record)
    return {"received": True, "id": record["id"]}


@router.get("/api/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    users = db_manager.collection("users")
    profile = users.find_one({"user_id": current_user["user_id"]})
    if not profile:
        return {
            "user_id": current_user["user_id"],
            "name": current_user["name"],
            "email": current_user["email"],
            "profession": "Farmer",
            "specialization": "",
            "profile_details": {},
            "language": "English",
            "preferredLanguage": "English",
            "location": "Vijayawada, Andhra Pradesh",
            "location_details": {},
            "interactionPreference": "both",
            "notificationsEnabled": True,
            "interests": [],
            "onboardingCompleted": False,
            "phone": "+91 98765 43210",
        }
    return {
        "user_id": profile["user_id"],
        "name": profile.get("name", current_user["name"]),
        "email": profile.get("email", current_user["email"]),
        "profession": profile.get("profession", "Farmer"),
        "specialization": profile.get("specialization", ""),
        "profile_details": profile.get("profile_details") or {},
        "language": profile.get("language", "English"),
        "preferredLanguage": profile.get("language", "English"),
        "location": profile.get("location", "Vijayawada, Andhra Pradesh"),
        "location_details": profile.get("location_details") or {},
        "interactionPreference": profile.get("interaction_preference", "both"),
        "notificationsEnabled": bool(profile.get("notifications_enabled", True)),
        "interests": profile.get("interests") or [],
        "onboardingCompleted": bool(profile.get("onboarding_completed", False)),
        "phone": profile.get("phone", ""),
    }


@router.put("/api/user/onboarding")
def save_onboarding(payload: OnboardingUpdate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    loc_details = payload.location or {}
    loc_parts = [
        (loc_details.get("cityOrVillage") or "").strip(),
        (loc_details.get("district") or "").strip(),
        (loc_details.get("state") or "").strip(),
    ]
    formatted_location = ", ".join([p for p in loc_parts if p])

    updates = {
        "profession": payload.profession.strip(),
        "specialization": (payload.specialization or "").strip(),
        "profile_details": payload.profile_details or {},
        "location_details": loc_details,
        "language": payload.preferredLanguage or "English",
        "interaction_preference": payload.interactionPreference or "both",
        "notifications_enabled": bool(payload.notificationsEnabled),
        "interests": payload.interests or [],
        "onboarding_completed": bool(payload.onboardingCompleted),
        "updated_at": now,
    }
    if payload.name and payload.name.strip():
        updates["name"] = payload.name.strip()
    if formatted_location:
        updates["location"] = formatted_location

    db_manager.collection("users").update_one(
        {"user_id": current_user["user_id"]},
        {"$set": updates},
        upsert=True,
    )

    db_manager.collection("user_preferences").update_one(
        {"user_id": current_user["user_id"]},
        {
            "$set": {
                "profession": updates["profession"],
                "language": updates["language"],
                "voiceAutoRead": (updates["interaction_preference"] == "voice"),
                "updated_at": now,
            }
        },
        upsert=True,
    )

    return get_profile(current_user)


@router.put("/api/profile")
def update_profile(payload: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    db_manager.collection("users").update_one(
        {"user_id": current_user["user_id"]},
        {"$set": updates},
        upsert=True,
    )
    return get_profile(current_user)


@router.get("/api/preferences")
def get_preferences(current_user: dict = Depends(get_current_user)):
    prefs = db_manager.collection("user_preferences").find_one(
        {"user_id": current_user["user_id"]}
    )
    if not prefs:
        return {
            "user_id": current_user["user_id"],
            "profession": "Farmer",
            "language": "English",
            "fontSize": "medium",
            "highContrast": False,
            "voiceAutoRead": False,
        }
    prefs.pop("_id", None)
    return prefs


@router.put("/api/preferences")
def update_preferences(payload: PreferencesUpdate, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    db_manager.collection("user_preferences").update_one(
        {"user_id": current_user["user_id"]},
        {"$set": updates},
        upsert=True,
    )
    return get_preferences(current_user)
