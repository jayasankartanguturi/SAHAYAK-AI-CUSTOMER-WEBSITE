import fitz
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app

client = TestClient(app)


def test_security_headers_and_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("x-request-id")


def test_magic_byte_upload_validation():
    spoofed_img = client.post(
        "/api/image/analyze",
        files={"file": ("fake.png", b"not-actually-a-png-file", "image/png")},
    )
    assert spoofed_img.status_code == 400

    spoofed_pdf = client.post(
        "/api/documents/upload",
        files={"file": ("fake.pdf", b"plain text pretending to be pdf", "application/pdf")},
    )
    assert spoofed_pdf.status_code == 400


def test_logout_revokes_jwt_and_account_data_deletion():
    import uuid

    email = f"sec-{uuid.uuid4().hex[:8]}@sahayak.ai"
    reg = client.post(
        "/api/auth/register",
        json={"name": "Sec User", "email": email, "password": "strongpassword123"},
    )
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create user-owned reminder & saved answer
    rem = client.post("/api/reminders", headers=headers, json={"title": "Test Reminder"})
    assert rem.status_code == 200
    sav = client.post(
        "/api/saved-answers",
        headers=headers,
        json={"title": "Saved Item", "content": "Content"},
    )
    assert sav.status_code == 200

    # Pagination check
    pag = client.get("/api/reminders?limit=1&offset=0", headers=headers)
    assert pag.status_code == 200
    assert pag.json()["total"] >= 1

    # Delete all user data
    del_res = client.delete("/api/account/data", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Logout revokes JWT
    out = client.post("/api/auth/logout", headers=headers)
    assert out.status_code == 200
    me_after = client.get("/api/auth/me", headers=headers)
    assert me_after.status_code == 401


def test_production_config_validation():
    s = Settings()
    s.ENVIRONMENT = "production"
    s.IS_PRODUCTION = True
    s.JWT_SECRET = "short"
    s.ADMIN_API_KEY = "short"
    s.CORS_ORIGINS = ["*"]
    s.ALLOW_DEMO_MODE = True
    problems = s.validate_for_production()
    assert len(problems) == 4


def test_google_signin_and_totp_authenticator_flow():
    import time
    import uuid
    from app.totp import _totp_at

    g_email = f"google-{uuid.uuid4().hex[:8]}@gmail.com"
    g_res = client.post(
        "/api/auth/google",
        json={"email": g_email, "name": "Google Citizen"},
    )
    assert g_res.status_code == 200
    assert "access_token" in g_res.json()

    # Register email/password user and enable TOTP Authenticator
    email = f"totp-{uuid.uuid4().hex[:8]}@sahayak.ai"
    reg = client.post(
        "/api/auth/register",
        json={"name": "Totp User", "email": email, "password": "password123"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    setup = client.post("/api/auth/2fa/setup", headers=headers)
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    assert setup.json()["otpauth_uri"].startswith("otpauth://totp/")

    code_now = _totp_at(secret, int(time.time() // 30))
    enable = client.post("/api/auth/2fa/enable", headers=headers, json={"code": code_now})
    assert enable.status_code == 200
    assert enable.json()["totp_enabled"] is True

    # Login now requires 2FA step
    login_step1 = client.post(
        "/api/auth/login",
        json={"email": email, "password": "password123"},
    )
    assert login_step1.status_code == 200
    assert login_step1.json()["requires_2fa"] is True
    temp_token = login_step1.json()["temp_token"]

    # Complete 2FA verification
    verify_step2 = client.post(
        "/api/auth/2fa/verify",
        json={"code": code_now, "temp_token": temp_token},
    )
    assert verify_step2.status_code == 200
    assert "access_token" in verify_step2.json()
