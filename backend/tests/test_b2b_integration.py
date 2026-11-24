import json
import time
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services.b2b_sync_service import sign_payload

client = TestClient(app)


def _register_and_login(prefix: str):
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/auth/register",
        json={
            "name": f"{prefix.title()} User",
            "email": email,
            "password": "Password123!",
            "profession": "Farmer",
            "language": "English",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    return data["access_token"], data["user"]


def _send_signed_webhook(payload: dict, secret: str = None):
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ts = str(int(time.time()))
    sig = sign_payload(raw, ts, secret or settings.INTER_SERVICE_SECRET)
    return client.post(
        "/api/internal/customer-requests/webhook",
        content=raw,
        headers={
            "Content-Type": "application/json",
            "X-Sahayak-Timestamp": ts,
            "X-Sahayak-Signature": sig,
        },
    )


def run_all_tests():
    token_a, user_a = _register_and_login("alice")
    token_b, _user_b = _register_and_login("bob")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Test 1: Customer submits request (with mocked successful B2B sync)
    class _OkResp:
        status_code = 200
        text = '{"synced": true}'

    with patch("app.services.b2b_sync_service.httpx.Client.post", return_value=_OkResp()):
        r1 = client.post(
            "/api/customer-requests",
            headers=headers_a,
            json={
                "title": "PM-KISAN e-KYC Verification Help",
                "description": "Need assistance verifying my Aadhaar e-KYC for installment.",
                "category": "Government Scheme Assistance",
                "priority": "High",
                "attachments": [{"name": "passbook.pdf", "mimeType": "application/pdf", "sizeBytes": 1024}],
            },
        )
    assert r1.status_code == 200, r1.text
    req_data = r1.json()
    req_id = req_data["request_id"]
    assert req_id.startswith("REQ-")
    assert req_data["status"] == "Pending"
    assert req_data["sync_status"] == "synced"
    print("PASS Test 1: Customer request submitted & synced:", req_id)

    # Test 2: Admin accepts request via signed webhook
    w_accept = _send_signed_webhook({
        "eventId": f"ev-accept-{uuid.uuid4().hex[:6]}",
        "requestId": req_id,
        "status": "Accepted",
        "adminResponse": "We have accepted your scheme assistance request.",
        "actorName": "Support Admin",
    })
    assert w_accept.status_code == 200, w_accept.text
    check2 = client.get(f"/api/customer-requests/{req_id}", headers=headers_a).json()
    assert check2["status"] == "Accepted"
    assert check2["admin_response"] == "We have accepted your scheme assistance request."
    print("PASS Test 2: Admin Accepted synchronized to Customer Portal")

    # Test 4: Admin assigns request
    w_assign = _send_signed_webhook({
        "eventId": f"ev-assign-{uuid.uuid4().hex[:6]}",
        "requestId": req_id,
        "status": "Assigned",
        "assignedAdminId": "staff-101",
        "assignedStaffName": "Anitha Rao",
        "actorName": "Super Admin",
    })
    assert w_assign.status_code == 200, w_assign.text
    check4 = client.get(f"/api/customer-requests/{req_id}", headers=headers_a).json()
    assert check4["status"] == "Assigned"
    assert check4["assigned_staff_name"] == "Anitha Rao"
    print("PASS Test 4: Admin Assignment synchronized")

    # Test 5: Admin resolves request + idempotency check + customer notification
    resolve_event = f"ev-resolve-{uuid.uuid4().hex[:6]}"
    w_res = _send_signed_webhook({
        "eventId": resolve_event,
        "requestId": req_id,
        "status": "Resolved",
        "adminResponse": "Your PM-KISAN e-KYC steps have been completed.",
        "actorName": "Anitha Rao",
    })
    assert w_res.status_code == 200, w_res.text
    # Replay same eventId -> must be idempotent (duplicate: True)
    w_dup = _send_signed_webhook({
        "eventId": resolve_event,
        "requestId": req_id,
        "status": "Resolved",
        "adminResponse": "Your PM-KISAN e-KYC steps have been completed.",
        "actorName": "Anitha Rao",
    })
    assert w_dup.status_code == 200 and w_dup.json().get("duplicate") is True
    notifs = client.get("/api/notifications", headers=headers_a).json()["items"]
    assert any("Resolved" in n["title"] and n.get("request_id") == req_id for n in notifs)
    print("PASS Test 5: Admin Resolve + Idempotency + Customer Notification verified")

    # Test 3: Admin rejects a separate request
    with patch("app.services.b2b_sync_service.httpx.Client.post", return_value=_OkResp()):
        r_rej = client.post(
            "/api/customer-requests",
            headers=headers_a,
            json={
                "title": "Duplicate Request Test",
                "description": "Testing admin rejection flow and response display.",
                "category": "General Assistance",
            },
        ).json()
    w_rej = _send_signed_webhook({
        "eventId": f"ev-reject-{uuid.uuid4().hex[:6]}",
        "requestId": r_rej["request_id"],
        "status": "Rejected",
        "adminResponse": "Duplicate of an already resolved ticket.",
        "actorName": "Support Admin",
    })
    assert w_rej.status_code == 200
    check3 = client.get(f"/api/customer-requests/{r_rej['request_id']}", headers=headers_a).json()
    assert check3["status"] == "Rejected"
    assert "Duplicate" in check3["admin_response"]
    print("PASS Test 3: Admin Rejection + response synchronized")

    # Test 6: Backend temporarily unavailable -> failed sync recorded & retried cleanly
    with patch("app.services.b2b_sync_service.httpx.Client.post", side_effect=ConnectionError("B2B offline")):
        r_fail = client.post(
            "/api/customer-requests",
            headers=headers_a,
            json={
                "title": "Offline Sync Resilience Test",
                "description": "Submitting while Express backend is temporarily down.",
                "category": "Technical Assistance",
            },
        )
    assert r_fail.status_code == 200
    fail_doc = r_fail.json()
    assert fail_doc["sync_status"] == "failed"
    assert fail_doc["sync_attempts"] >= 2

    with patch("app.services.b2b_sync_service.httpx.Client.post", return_value=_OkResp()):
        retry_res = client.post("/api/customer-requests/retry-sync", headers=headers_a)
    assert retry_res.status_code == 200
    assert retry_res.json()["synced"] >= 1
    after_retry = client.get(f"/api/customer-requests/{fail_doc['request_id']}", headers=headers_a).json()
    assert after_retry["sync_status"] == "synced"
    print("PASS Test 6: Failed sync recorded & retried cleanly without duplicates")

    # Test 7: Security (ownership isolation, invalid webhook signature, disallowed file extension)
    other_view = client.get(f"/api/customer-requests/{req_id}", headers=headers_b)
    assert other_view.status_code == 403, f"Expected 403, got {other_view.status_code}"

    other_reply = client.post(
        f"/api/customer-requests/{req_id}/reply",
        headers=headers_b,
        json={"message": "Unauthorized reply"},
    )
    assert other_reply.status_code == 403

    bad_sig = _send_signed_webhook(
        {"requestId": req_id, "status": "Closed"},
        secret="wrong-secret-key",
    )
    assert bad_sig.status_code == 401, f"Expected 401, got {bad_sig.status_code}"

    bad_file = client.post(
        "/api/customer-requests",
        headers=headers_a,
        json={
            "title": "Malicious Attachment Check",
            "description": "Testing file extension validation.",
            "category": "Document Assistance",
            "attachments": [{"name": "malware.exe", "sizeBytes": 100}],
        },
    )
    assert bad_file.status_code == 400
    print("PASS Test 7: Ownership isolation (403), HMAC signature guard (401), file validation (400)")


if __name__ == "__main__":
    run_all_tests()
    print("ALL_7_INTEGRATION_TESTS_PASSED")
