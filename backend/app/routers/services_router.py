from typing import Optional
from fastapi import APIRouter

from ..market_service import fetch_market_updates
from ..rag import rag_store
from ..schemas import EligibilityRequest
from ..weather_service import fetch_weather

router = APIRouter(tags=["Public Services, Weather & Market"])

DEMO_SCHEMES = [
    {
        "id": "pm-kisan",
        "name": "PM-KISAN Samman Nidhi",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "professions": ["Farmer"],
        "benefit": "Rs. 6,000 / year in 3 installments",
        "max_income": 600000,
        "requires_land": True,
        "documents": ["Aadhaar Card", "Landholding Record (RoR)", "Bank Passbook", "Mobile Number"],
        "official_url": "https://pmkisan.gov.in",
        "status_note": "Demo Reference • Verify on pmkisan.gov.in",
    },
    {
        "id": "pmfby",
        "name": "Pradhan Mantri Fasal Bima Yojana",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "professions": ["Farmer"],
        "benefit": "Crop loss insurance at 1.5%–2% farmer premium",
        "max_income": 1000000,
        "requires_land": False,
        "documents": ["Aadhaar Card", "Sowing Certificate", "Land/Lease Papers", "Bank Account"],
        "official_url": "https://pmfby.gov.in",
        "status_note": "Demo Reference • Verify on pmfby.gov.in",
    },
    {
        "id": "pmmsy",
        "name": "Pradhan Mantri Matsya Sampada Yojana",
        "ministry": "Department of Fisheries",
        "professions": ["Fisherman"],
        "benefit": "40%–60% subsidy for boats, safety kits & cold storage",
        "max_income": 800000,
        "requires_land": False,
        "documents": ["Fisherman ID Card", "Aadhaar Card", "Bank Details", "Project Proposal"],
        "official_url": "https://dof.gov.in",
        "status_note": "Demo Reference • Verify on dof.gov.in",
    },
    {
        "id": "nsp-scholarship",
        "name": "National Scholarship Portal (Post-Matric)",
        "ministry": "Ministry of Education",
        "professions": ["Student"],
        "benefit": "Tuition & maintenance allowance based on course",
        "max_income": 250000,
        "requires_land": False,
        "documents": ["Bonafide Certificate", "Income Certificate", "Previous Marksheet", "Aadhaar"],
        "official_url": "https://scholarships.gov.in",
        "status_note": "Demo Reference • Verify on scholarships.gov.in",
    },
    {
        "id": "pm-mudra",
        "name": "PM Mudra Yojana (Shishu / Kishor / Tarun)",
        "ministry": "Ministry of Finance",
        "professions": ["Business Owner", "Street Vendor", "Artisan"],
        "benefit": "Collateral-free business loans up to Rs. 10 Lakh",
        "max_income": 1500000,
        "requires_land": False,
        "documents": ["Aadhaar & PAN", "Business Plan / Shop Proof", "Bank Statement"],
        "official_url": "https://mudra.org.in",
        "status_note": "Demo Reference • Verify on mudra.org.in",
    },
    {
        "id": "pm-vishwakarma",
        "name": "PM Vishwakarma Artisan Scheme",
        "ministry": "Ministry of MSME",
        "professions": ["Artisan"],
        "benefit": "Rs. 15,000 toolkit incentive + 5% credit + skill stipend",
        "max_income": 800000,
        "requires_land": False,
        "documents": ["Aadhaar Card", "Artisan Trade Proof", "Bank Passbook", "Ration Card"],
        "official_url": "https://pmvishwakarma.gov.in",
        "status_note": "Demo Reference • Verify on pmvishwakarma.gov.in",
    },
]


@router.get("/api/schemes")
def get_schemes(profession: Optional[str] = None):
    if profession and profession != "All":
        filtered = [s for s in DEMO_SCHEMES if profession in s["professions"]]
        return {"schemes": filtered, "is_demo": True}
    return {"schemes": DEMO_SCHEMES, "is_demo": True}


@router.post("/api/schemes/eligibility")
def check_eligibility(payload: EligibilityRequest):
    matches = []
    for s in DEMO_SCHEMES:
        reasons = []
        eligible = True
        if payload.profession not in s["professions"] and payload.profession != "General Citizen":
            eligible = False
            reasons.append(f"Targeted for {', '.join(s['professions'])}")
        if payload.annual_income > s["max_income"]:
            eligible = False
            reasons.append(f"Income exceeds demo threshold of Rs. {s['max_income']:,}")
        if s["requires_land"] and not payload.owns_land:
            eligible = False
            reasons.append("Requires cultivable landholding record")
        if not payload.has_aadhaar:
            eligible = False
            reasons.append("Aadhaar linkage is required for DBT")

        matches.append({
            **s,
            "eligible": eligible,
            "reasons": reasons if reasons else ["Meets primary demo criteria — verify on official portal"],
        })
    return {"results": matches, "is_demo": True}


@router.get("/api/weather")
def get_weather(
    city: str = "Vijayawada",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    return fetch_weather(city=city, lat=lat, lon=lon)


@router.get("/api/market-updates")
def get_market_updates(
    commodity: Optional[str] = None,
    location: Optional[str] = None,
):
    return fetch_market_updates(commodity=commodity, location=location)


@router.get("/api/emergency/alerts")
def get_emergency_alerts():
    return {
        "live_alerts_connected": False,
        "status_note": "No live IMD/NDMA CAP alert feed connected. Never fabricate warnings — verify live alerts on mausam.imd.gov.in and ndma.gov.in.",
        "helplines": [
            {"name": "National Emergency Number", "number": "112"},
            {"name": "Disaster Management (NDMA)", "number": "1078"},
            {"name": "Ambulance", "number": "108"},
            {"name": "Fire & Rescue", "number": "101"},
            {"name": "Kisan Call Centre", "number": "1800-180-1551"},
        ],
        "advisory_urls": [
            "https://mausam.imd.gov.in",
            "https://ndma.gov.in",
        ],
    }


@router.get("/api/sources")
def list_trusted_sources():
    seen = {}
    for d in rag_store.documents:
        if d.get("category") == "user_document":
            continue
        src = d.get("source", "")
        if src not in seen:
            seen[src] = {
                "title": d.get("title", ""),
                "source": src,
                "url": d.get("source_url", ""),
                "last_updated": d.get("last_updated", d.get("updated", "")),
                "professions": d.get("professions", []),
            }
    return {"sources": list(seen.values()), "total_chunks": len(rag_store.documents)}
