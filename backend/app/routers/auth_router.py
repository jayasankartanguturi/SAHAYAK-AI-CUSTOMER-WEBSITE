import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    require_current_user,
    revoke_token,
    verify_password,
)
from ..config import settings
from ..database import db_manager
from ..rag import rag_store
from ..schemas import (
    ChangePasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    TotpVerifyRequest,
)
from ..totp import build_otpauth_uri, generate_totp_secret, verify_totp_code

router = APIRouter(tags=["Auth & Account"])
_logout_bearer = HTTPBearer(auto_error=False)


def _issue_auth_response(user_doc: dict) -> dict:
    token = create_access_token({
        "sub": user_doc["user_id"],
        "name": user_doc["name"],
        "email": user_doc["email"],
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "totp_enabled": bool(user_doc.get("totp_enabled", False)),
        "user": {
            "user_id": user_doc["user_id"],
            "name": user_doc["name"],
            "email": user_doc["email"],
            "profession": user_doc.get("profession", "Farmer"),
            "specialization": user_doc.get("specialization", ""),
            "profile_details": user_doc.get("profile_details") or {},
            "location": user_doc.get("location", "Vijayawada, Andhra Pradesh"),
            "location_details": user_doc.get("location_details") or {},
            "language": user_doc.get("language", "English"),
            "preferredLanguage": user_doc.get("language", "English"),
            "interactionPreference": user_doc.get("interaction_preference", "both"),
            "notificationsEnabled": bool(user_doc.get("notifications_enabled", True)),
            "interests": user_doc.get("interests") or [],
            "onboardingCompleted": bool(user_doc.get("onboarding_completed", False)),
            "totp_enabled": bool(user_doc.get("totp_enabled", False)),
        },
    }


def _format_location_string(loc_details: Optional[dict]) -> str:
    if not isinstance(loc_details, dict):
        return "Vijayawada, Andhra Pradesh"
    parts = [
        (loc_details.get("cityOrVillage") or "").strip(),
        (loc_details.get("district") or "").strip(),
        (loc_details.get("state") or "").strip(),
    ]
    cleaned = [p for p in parts if p]
    return ", ".join(cleaned) if cleaned else "Vijayawada, Andhra Pradesh"


@router.post("/api/auth/register")
def register(payload: RegisterRequest):
    users = db_manager.collection("users")
    email_clean = payload.email.lower().strip()
    if users.find_one({"email": email_clean}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    loc_details = payload.location_details or {}
    user_doc = {
        "user_id": user_id,
        "name": payload.name.strip(),
        "email": email_clean,
        "password_hash": hash_password(payload.password),
        "profession": payload.profession,
        "specialization": (payload.specialization or "").strip(),
        "profile_details": payload.profile_details or {},
        "language": payload.language,
        "location": _format_location_string(loc_details),
        "location_details": loc_details,
        "interaction_preference": payload.interaction_preference or "both",
        "notifications_enabled": True if payload.notifications_enabled is None else bool(payload.notifications_enabled),
        "interests": payload.interests or [],
        "onboarding_completed": bool(payload.onboarding_completed),
        "phone": "",
        "totp_enabled": False,
        "totp_secret": None,
        "created_at": now,
    }
    users.insert_one(user_doc)

    db_manager.collection("user_preferences").insert_one({
        "user_id": user_id,
        "profession": payload.profession,
        "language": payload.language,
        "fontSize": "medium",
        "highContrast": False,
        "voiceAutoRead": (payload.interaction_preference == "voice"),
        "updated_at": now,
    })

    return _issue_auth_response(user_doc)


@router.post("/api/auth/login")
def login(payload: LoginRequest):
    users = db_manager.collection("users")
    user = users.find_one({"email": payload.email.lower().strip()})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.get("totp_enabled") and user.get("totp_secret"):
        if not payload.totp_code:
            temp_token = create_access_token(
                {"sub": user["user_id"], "scope": "2fa_pending"},
                expires_delta=timedelta(minutes=5),
            )
            return {
                "requires_2fa": True,
                "temp_token": temp_token,
                "message": "Enter the 6-digit code from your Authenticator app.",
            }
        if not verify_totp_code(user["totp_secret"], payload.totp_code):
            raise HTTPException(status_code=401, detail="Invalid Authenticator 2FA code")

    return _issue_auth_response(user)


@router.post("/api/auth/google")
def google_sign_in(payload: GoogleAuthRequest):
    """
    Verifies a Google Identity Services ID token when GOOGLE_CLIENT_ID is configured.
    In development (`ALLOW_DEMO_MODE=true`), allows simulated Google sign-in with email/name.
    """
    email = None
    name = None

    if payload.credential and settings.GOOGLE_CLIENT_ID:
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token

            idinfo = id_token.verify_oauth2_token(
                payload.credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
            email = (idinfo.get("email") or "").lower().strip()
            name = idinfo.get("name") or email.split("@")[0].title()
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Google credential")
    elif settings.ALLOW_DEMO_MODE and payload.email:
        email = payload.email.lower().strip()
        local = email.split("@")[0].replace(".", " ").replace("_", " ").strip()
        name = (payload.name or local.title() or "Citizen").strip()
    else:
        raise HTTPException(
            status_code=400,
            detail="Google Sign-In requires GOOGLE_CLIENT_ID configuration in production.",
        )

    users = db_manager.collection("users")
    user = users.find_one({"email": email})
    if not user:
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        user = {
            "user_id": user_id,
            "name": name,
            "email": email,
            "password_hash": None,
            "auth_provider": "google",
            "profession": "Farmer",
            "specialization": "",
            "profile_details": {},
            "language": "English",
            "location": "Vijayawada, Andhra Pradesh",
            "location_details": {},
            "interaction_preference": "both",
            "notifications_enabled": True,
            "interests": [],
            "onboarding_completed": False,
            "phone": "",
            "totp_enabled": False,
            "totp_secret": None,
            "created_at": now,
        }
        users.insert_one(user)

    if user.get("totp_enabled") and user.get("totp_secret"):
        temp_token = create_access_token(
            {"sub": user["user_id"], "scope": "2fa_pending"},
            expires_delta=timedelta(minutes=5),
        )
        return {
            "requires_2fa": True,
            "temp_token": temp_token,
            "message": "Enter the 6-digit code from your Authenticator app.",
        }

    return _issue_auth_response(user)


@router.get("/api/auth/2fa/status")
def totp_status(current_user: dict = Depends(require_current_user)):
    user = db_manager.collection("users").find_one({"user_id": current_user["user_id"]})
    return {"totp_enabled": bool(user and user.get("totp_enabled", False))}


@router.post("/api/auth/2fa/setup")
def totp_setup(current_user: dict = Depends(require_current_user)):
    secret = generate_totp_secret()
    db_manager.collection("users").update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"totp_pending_secret": secret}},
    )
    uri = build_otpauth_uri(current_user["email"], secret)
    return {"secret": secret, "otpauth_uri": uri}


@router.post("/api/auth/2fa/enable")
def totp_enable(payload: TotpVerifyRequest, current_user: dict = Depends(require_current_user)):
    users = db_manager.collection("users")
    user = users.find_one({"user_id": current_user["user_id"]})
    secret = user.get("totp_pending_secret") if user else None
    if not secret:
        raise HTTPException(status_code=400, detail="Run /api/auth/2fa/setup first")
    if not verify_totp_code(secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid 6-digit Authenticator code")
    users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"totp_enabled": True, "totp_secret": secret, "totp_pending_secret": None}},
    )
    return {"totp_enabled": True}


@router.post("/api/auth/2fa/disable")
def totp_disable(payload: TotpVerifyRequest, current_user: dict = Depends(require_current_user)):
    users = db_manager.collection("users")
    user = users.find_one({"user_id": current_user["user_id"]})
    if not user or not user.get("totp_enabled"):
        return {"totp_enabled": False}
    if not verify_totp_code(user["totp_secret"], payload.code):
        raise HTTPException(status_code=400, detail="Invalid 6-digit Authenticator code")
    users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"totp_enabled": False, "totp_secret": None}},
    )
    return {"totp_enabled": False}


@router.post("/api/auth/2fa/verify")
def totp_verify_login(payload: TotpVerifyRequest):
    if not payload.temp_token:
        raise HTTPException(status_code=400, detail="Missing temporary 2FA token")
    decoded = decode_access_token(payload.temp_token)
    if not decoded or decoded.get("scope") != "2fa_pending":
        raise HTTPException(status_code=401, detail="Invalid or expired 2FA session")
    user = db_manager.collection("users").find_one({"user_id": decoded.get("sub")})
    if not user or not user.get("totp_secret"):
        raise HTTPException(status_code=401, detail="2FA not configured for user")
    if not verify_totp_code(user["totp_secret"], payload.code):
        raise HTTPException(status_code=401, detail="Invalid 6-digit Authenticator code")
    return _issue_auth_response(user)


@router.get("/api/auth/me")
def me(current_user: dict = Depends(require_current_user)):
    return current_user


@router.post("/api/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(require_current_user),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")

    users = db_manager.collection("users")
    user = users.find_one({"user_id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    existing_hash = user.get("password_hash")
    if existing_hash:
        if not payload.current_password or not verify_password(payload.current_password, existing_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        if payload.current_password == payload.new_password:
            raise HTTPException(status_code=400, detail="New password must be different from your current password.")

    new_hash = hash_password(payload.new_password)
    users.update_one(
        {"user_id": current_user["user_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "password_updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {
        "updated": True,
        "message": "Password updated successfully. Your new password is active immediately.",
    }


@router.post("/api/auth/logout")
def logout(credentials: Optional[HTTPAuthorizationCredentials] = Depends(_logout_bearer)):
    if credentials and credentials.credentials:
        revoke_token(credentials.credentials)
    return {"logged_out": True}


@router.delete("/api/account/data")
def delete_my_account_data(current_user: dict = Depends(require_current_user)):
    """Deletes all user-owned conversations, messages, documents, saved answers, reminders, notifications, support requests, feedback, and preferences."""
    uid = current_user["user_id"]
    for doc in list(db_manager.collection("documents").find({"user_id": uid})):
        if doc.get("id"):
            rag_store.remove_by_prefix(f"doc-{doc['id']}-")

    counts = {}
    for col_name in (
        "conversations",
        "messages",
        "documents",
        "saved_answers",
        "notifications",
        "reminders",
        "support_requests",
        "feedback",
        "user_preferences",
    ):
        res = db_manager.collection(col_name).delete_many({"user_id": uid})
        counts[col_name] = getattr(res, "deleted_count", res if isinstance(res, int) else 0)

    return {"deleted": True, "user_id": uid, "removed": counts}
