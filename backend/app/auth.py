import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings
from .database import db_manager

security = HTTPBearer(auto_error=False)

# Fast in-memory cache backed by persistent MongoDB `revoked_tokens` collection.
_REVOKED_JTIS: set[str] = set()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti:
            if jti in _REVOKED_JTIS:
                return None
            if db_manager.collection("revoked_tokens").find_one({"jti": jti}):
                _REVOKED_JTIS.add(jti)
                return None
        return payload
    except jwt.PyJWTError:
        return None


def revoke_token(token: str) -> None:
    payload = decode_access_token(token)
    if payload and payload.get("jti"):
        jti = payload["jti"]
        _REVOKED_JTIS.add(jti)
        exp_ts = payload.get("exp")
        expires_at = (
            datetime.fromtimestamp(exp_ts, tz=timezone.utc)
            if isinstance(exp_ts, (int, float))
            else datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        )
        db_manager.collection("revoked_tokens").update_one(
            {"jti": jti},
            {
                "$set": {
                    "jti": jti,
                    "expires_at": expires_at,
                    "revoked_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )


def require_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Strictly requires a valid, non-revoked JWT Bearer token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )
    return {
        "user_id": payload.get("sub"),
        "name": payload.get("name", "Citizen"),
        "email": payload.get("email", ""),
        "role": payload.get("role", "citizen"),
        "is_demo": False,
    }


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Returns authenticated user from JWT. In development (`ALLOW_DEMO_MODE=true`),
    falls back to the isolated demo citizen session when no Authorization header is sent.
    Invalid or revoked tokens always return 401.
    """
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
            )
        return {
            "user_id": payload.get("sub", "demo-jayasankar"),
            "name": payload.get("name", "Jayasankar"),
            "email": payload.get("email", "jayasankar@sahayak.demo"),
            "role": payload.get("role", "citizen"),
            "is_demo": False,
        }
    if not settings.ALLOW_DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required in production mode",
        )
    return {
        "user_id": "demo-jayasankar",
        "name": "Jayasankar",
        "email": "jayasankar@sahayak.demo",
        "role": "citizen",
        "is_demo": True,
    }
