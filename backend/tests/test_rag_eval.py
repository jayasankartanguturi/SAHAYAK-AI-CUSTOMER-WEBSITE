from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_rag_profession_coverage_and_sources():
    cases = [
        ("Farmer", "PM-KISAN installment and paddy leaf disease"),
        ("Fisherman", "PMMSY boat subsidy and marine safety"),
        ("Student", "National Scholarship Portal documents"),
        ("Artisan", "PM Vishwakarma toolkit incentive"),
        ("Business Owner", "PM Mudra loan and MSME Udyam"),
        ("Street Vendor", "PM SVANidhi working capital loan"),
        ("General Citizen", "Aadhaar and CSC citizen services"),
    ]
    for profession, query in cases:
        res = client.post(
            "/api/chat",
            json={"message": query, "language": "English", "profession": profession},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["confidence"] in ("high", "medium")
        assert body["uncertain"] is False
        assert len(body["sources"]) >= 1
        assert body["sources"][0]["url"].startswith("https://")
        assert body["sources"][0]["last_updated"]


def test_telugu_response_and_uncertainty_handling():
    telugu_res = client.post(
        "/api/chat",
        json={
            "message": "PM Kisan Scheme eligibility",
            "language": "Telugu",
            "profession": "Farmer",
        },
    )
    assert telugu_res.status_code == 200
    assert telugu_res.json()["response_language"] == "Telugu"
    assert "సహాయక్ AI" in telugu_res.json()["answer"]

    unknown_res = client.post(
        "/api/chat",
        json={
            "message": "xylophone quantum flux capacitor price",
            "language": "English",
            "profession": "General Citizen",
        },
    )
    assert unknown_res.status_code == 200
    assert unknown_res.json()["confidence"] == "low"
    assert unknown_res.json()["uncertain"] is True


def test_greetings_thanks_and_smart_titles():
    # Greeting should NOT trigger RAG or return "Verified Information Unavailable"
    hi_res = client.post(
        "/api/chat",
        json={"message": "hi", "language": "English", "profession": "Farmer"},
    )
    assert hi_res.status_code == 200
    hi_data = hi_res.json()
    assert hi_data["rag_used"] is False
    assert hi_data["sources"] == []
    assert hi_data["uncertain"] is False
    assert hi_data["conversation_title"] == "General Chat"
    assert "Sahayak AI" in hi_data["answer"]

    # Telugu greeting
    te_hi = client.post(
        "/api/chat",
        json={"message": "నమస్కారం", "language": "Telugu", "profession": "Farmer"},
    )
    assert te_hi.status_code == 200
    assert te_hi.json()["rag_used"] is False
    assert "నమస్కారం" in te_hi.json()["answer"]

    # Follow-up factual question in same General Chat upgrades the title
    conv_id = hi_data["conversation_id"]
    fact = client.post(
        "/api/chat",
        json={
            "message": "Explain PM Kisan Scheme",
            "language": "English",
            "profession": "Farmer",
            "conversation_id": conv_id,
        },
    )
    assert fact.status_code == 200
    assert fact.json()["rag_used"] is True
    assert fact.json()["conversation_title"] == "PM Kisan Scheme"

    # Follow-up "tell me more" uses context
    more = client.post(
        "/api/chat",
        json={
            "message": "tell me more",
            "language": "English",
            "profession": "Farmer",
            "conversation_id": conv_id,
        },
    )
    assert more.status_code == 200
    assert more.json()["rag_used"] is True

    # Thanks should be casual
    thx = client.post(
        "/api/chat",
        json={"message": "thank you", "language": "English", "profession": "Farmer"},
    )
    assert thx.status_code == 200
    assert thx.json()["rag_used"] is False


def test_weather_market_and_emergency_endpoints():
    w = client.get("/api/weather?city=Vijayawada")
    assert w.status_code == 200
    w_data = w.json()
    assert "current" in w_data
    assert len(w_data["forecast"]) == 5
    assert "provider" in w_data

    m = client.get("/api/market-updates?commodity=Chilli&location=Guntur")
    assert m.status_code == 200
    m_data = m.json()
    assert len(m_data["items"]) >= 1
    assert "min_price" in m_data["items"][0]
    assert "modal_price" in m_data["items"][0]

    e = client.get("/api/emergency/alerts")
    assert e.status_code == 200
    e_data = e.json()
    assert e_data["live_alerts_connected"] is False
    assert any(h["number"] == "112" for h in e_data["helplines"])


def test_knowledge_admin_pipeline():
    # Reject missing admin key
    unauth = client.get("/api/admin/knowledge/sources")
    assert unauth.status_code == 403

    headers = {"X-Admin-Key": "sahayak-admin-dev"}
    add_res = client.post(
        "/api/admin/knowledge/documents",
        headers=headers,
        json={
            "id": "admin-test-1",
            "title": "Zero Budget Natural Farming Guide",
            "source": "apcnf.in",
            "source_url": "https://apcnf.in",
            "professions": ["Farmer"],
            "text": "Jeevamrutham and Beejamrutham improve soil microbial activity naturally.",
        },
    )
    assert add_res.status_code == 200
    assert add_res.json()["indexed"] is True

    chat_res = client.post(
        "/api/chat",
        json={"message": "How does Jeevamrutham help soil?", "language": "English", "profession": "Farmer"},
    )
    assert chat_res.status_code == 200
    assert any("apcnf.in" in s["source"] for s in chat_res.json()["sources"])

    del_res = client.delete("/api/admin/knowledge/documents/admin-test-1", headers=headers)
    assert del_res.status_code == 200
