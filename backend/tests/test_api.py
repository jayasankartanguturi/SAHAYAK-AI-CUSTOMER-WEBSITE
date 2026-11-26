import uuid
import fitz
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_and_collections():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "conversations" in data["collections"]
    assert "user_preferences" in data["collections"]


def test_auth_register_login_and_protected_me():
    # Unauthenticated /api/auth/me must return 401
    unauth = client.get("/api/auth/me")
    assert unauth.status_code == 401

    email = f"testfarmer-{uuid.uuid4().hex[:8]}@sahayak.ai"
    reg = client.post(
        "/api/auth/register",
        json={
            "name": "Test Farmer",
            "email": email,
            "password": "securepassword123",
            "profession": "Farmer",
            "language": "Telugu",
        },
    )
    assert reg.status_code == 200
    token = reg.json()["access_token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    login_res = client.post(
        "/api/auth/login",
        json={"email": email, "password": "securepassword123"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_chat_conversation_context_and_telugu():
    res1 = client.post(
        "/api/chat",
        json={
            "message": "Explain PM Kisan Scheme",
            "language": "Telugu",
            "profession": "Farmer",
        },
    )
    assert res1.status_code == 200
    conv_id = res1.json()["conversation_id"]
    assert conv_id

    res2 = client.post(
        "/api/chat",
        json={
            "message": "What documents do I need?",
            "language": "English",
            "profession": "Farmer",
            "conversation_id": conv_id,
        },
    )
    assert res2.status_code == 200
    assert res2.json()["conversation_id"] == conv_id

    rename = client.patch(
        f"/api/conversations/{conv_id}",
        json={"title": "PM-KISAN Guide", "archived": True},
    )
    assert rename.status_code == 200
    assert rename.json()["title"] == "PM-KISAN Guide"
    assert rename.json()["archived"] is True

    msgs = client.get(f"/api/conversations/{conv_id}/messages")
    assert msgs.status_code == 200
    assert len(msgs.json()["messages"]) == 4

    deleted = client.delete(f"/api/conversations/{conv_id}")
    assert deleted.status_code == 200


def test_image_upload_validation(monkeypatch):
    bad = client.post(
        "/api/image/analyze",
        files={"file": ("bad.txt", b"not-an-image", "text/plain")},
    )
    assert bad.status_code == 400

    # Spoofed MIME type (claims PNG, contains plain text) must be rejected
    spoofed = client.post(
        "/api/image/analyze",
        files={"file": ("fake.png", b"not-real-png-bytes", "image/png")},
    )
    assert spoofed.status_code == 400

    # Minimal valid PNG, JPEG, GIF headers
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
    jpg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    gif_bytes = b"GIF89a\x01\x00\x01\x00\x00\x00\x00;"

    # Mock Gemini Vision to verify live response path without hitting external API in unit tests
    from app import gemini_service
    monkeypatch.setattr(
        gemini_service,
        "_call_gemini_vision",
        lambda prompt, image_bytes, mime_type: (
            f"Live AI analysis for {mime_type} ({len(image_bytes)} bytes)",
            "gemini-2.5-flash",
            None,
        ),
    )

    good_png = client.post(
        "/api/image/analyze",
        files={"file": ("leaf.png", png_bytes, "image/png")},
        data={"prompt": "Check leaf", "language": "English", "profession": "Farmer"},
    )
    assert good_png.status_code == 200
    body = good_png.json()
    assert body["mode"] == "live-gemini-vision"
    assert body["model"] == "gemini-2.5-flash"
    assert "image/png" in body["analysis"]

    # image/jpg alias and application/octet-stream magic-byte fallback should both succeed
    good_jpg = client.post(
        "/api/image/analyze",
        files={"file": ("crop.jpg", jpg_bytes, "image/jpg")},
        data={"prompt": "Check crop", "language": "English", "profession": "Farmer"},
    )
    assert good_jpg.status_code == 200
    assert good_jpg.json()["mode"] == "live-gemini-vision"
    assert "image/jpeg" in good_jpg.json()["analysis"]

    good_octet = client.post(
        "/api/image/analyze",
        files={"file": ("leaf.gif", gif_bytes, "application/octet-stream")},
        data={"prompt": "Check gif", "language": "English", "profession": "Farmer"},
    )
    assert good_octet.status_code == 200
    assert "image/gif" in good_octet.json()["analysis"]


def test_pdf_upload_pymupdf_and_ownership():
    # Create a real PDF in memory using PyMuPDF
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_text((72, 72), "Sahayak AI Test Document: PM-KISAN provides Rs 6000 per year.")
    pdf_bytes = pdf.tobytes()
    pdf.close()

    # Register two users to verify ownership isolation
    u1_email = f"u1-{uuid.uuid4().hex[:8]}@sahayak.ai"
    u2_email = f"u2-{uuid.uuid4().hex[:8]}@sahayak.ai"
    u1 = client.post(
        "/api/auth/register",
        json={"name": "User One", "email": u1_email, "password": "password123"},
    ).json()["access_token"]
    u2 = client.post(
        "/api/auth/register",
        json={"name": "User Two", "email": u2_email, "password": "password123"},
    ).json()["access_token"]

    upload = client.post(
        "/api/documents/upload",
        headers={"Authorization": f"Bearer {u1}"},
        files={"file": ("kisan.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload.status_code == 200
    doc_id = upload.json()["id"]
    assert "summary" in upload.json()
    assert upload.json()["pages"] == 1

    # User 2 must NOT be able to ask about User 1's document
    forbidden = client.post(
        f"/api/documents/{doc_id}/ask",
        headers={"Authorization": f"Bearer {u2}"},
        json={"message": "Summarize this", "language": "English", "profession": "Farmer"},
    )
    assert forbidden.status_code == 404


def test_reminders_preferences_and_saved_answers():
    rem = client.post(
        "/api/reminders",
        json={"title": "Renew Kisan Credit Card", "detail": "Visit bank"},
    )
    assert rem.status_code == 200
    rem_id = rem.json()["id"]

    rems = client.get("/api/reminders")
    assert any(r["id"] == rem_id for r in rems.json()["items"])

    del_rem = client.delete(f"/api/reminders/{rem_id}")
    assert del_rem.status_code == 200

    pref = client.put(
        "/api/preferences",
        json={"language": "Telugu", "profession": "Fisherman", "fontSize": "large"},
    )
    assert pref.status_code == 200
    assert pref.json()["language"] == "Telugu"
    assert pref.json()["profession"] == "Fisherman"


def test_chatgpt_single_conversation_five_messages_and_isolation():
    u1_email = f"chat1-{uuid.uuid4().hex[:8]}@sahayak.ai"
    u2_email = f"chat2-{uuid.uuid4().hex[:8]}@sahayak.ai"
    t1 = client.post(
        "/api/auth/register",
        json={"name": "User A", "email": u1_email, "password": "password123"},
    ).json()["access_token"]
    t2 = client.post(
        "/api/auth/register",
        json={"name": "User B", "email": u2_email, "password": "password123"},
    ).json()["access_token"]

    h1 = {"Authorization": f"Bearer {t1}"}
    h2 = {"Authorization": f"Bearer {t2}"}

    # 1. Create one conversation
    conv = client.post("/api/conversations", headers=h1, json={"title": "General Chat"})
    assert conv.status_code == 200
    conv_id = conv.json()["id"]

    # 2. Send 5 messages into that same conversation
    prompts = [
        "Hi",
        "Explain PM Kisan Scheme",
        "What documents are required?",
        "tell me more",
        "thank you",
    ]
    for p in prompts:
        m = client.post(
            f"/api/conversations/{conv_id}/messages",
            headers=h1,
            json={"message": p, "language": "English", "profession": "Farmer"},
        )
        assert m.status_code == 200
        assert m.json()["conversation_id"] == conv_id

    # 3. Only ONE conversation entry should exist for User A
    convs_u1 = client.get("/api/conversations", headers=h1).json()["items"]
    assert len(convs_u1) == 1
    assert convs_u1[0]["id"] == conv_id
    assert convs_u1[0]["title"] == "PM Kisan Scheme"

    # 4. All 10 messages (5 user + 5 assistant) load in chronological order
    full_conv = client.get(f"/api/conversations/{conv_id}", headers=h1)
    assert full_conv.status_code == 200
    assert len(full_conv.json()["messages"]) == 10

    # 5. User B cannot see User A's conversation
    convs_u2 = client.get("/api/conversations", headers=h2).json()["items"]
    assert len(convs_u2) == 0
    forbidden = client.get(f"/api/conversations/{conv_id}", headers=h2)
    assert forbidden.status_code == 404


def test_voice_and_translate_endpoints(monkeypatch):
    from app import gemini_service

    monkeypatch.setattr(
        gemini_service,
        "_call_gemini_text",
        lambda prompt: "తెలుగు అనువాదం: ఇది పరీక్ష సందేశం.",
    )

    voice_res = client.post(
        "/api/voice/assist",
        json={"transcript": "Tell me about PM Kisan", "language": "Telugu", "profession": "Farmer"},
    )
    assert voice_res.status_code == 200
    assert voice_res.json()["mode"] == "live-gemini"

    tr_res = client.post(
        "/api/translate",
        json={
            "text": "Apply for crop insurance before the deadline.",
            "target_language": "Telugu",
            "profession": "Farmer",
        },
    )
    assert tr_res.status_code == 200
    body = tr_res.json()
    assert body["mode"] == "live-gemini"
    assert body["target_language"] == "Telugu"
    assert "తెలుగు" in body["translated"]

