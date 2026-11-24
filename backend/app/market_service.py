import logging
from datetime import datetime, timezone
from typing import Optional
import httpx
from .config import settings

logger = logging.getLogger(__name__)

# Agmarknet resource ID on data.gov.in
AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

DEMO_MANDI_RECORDS = [
    {
        "commodity": "Paddy (Common)",
        "market": "Vijayawada",
        "state": "Andhra Pradesh",
        "min_price": "Rs. 2,180 / qtl",
        "max_price": "Rs. 2,380 / qtl",
        "modal_price": "Rs. 2,300 / qtl",
        "price": "Rs. 2,300 / qtl",
        "change": "+1.8%",
        "update_date": "Demo Snapshot",
    },
    {
        "commodity": "Dry Chilli (Teja)",
        "market": "Guntur",
        "state": "Andhra Pradesh",
        "min_price": "Rs. 15,200 / qtl",
        "max_price": "Rs. 17,100 / qtl",
        "modal_price": "Rs. 16,400 / qtl",
        "price": "Rs. 16,400 / qtl",
        "change": "+2.4%",
        "update_date": "Demo Snapshot",
    },
    {
        "commodity": "Cotton (Medium)",
        "market": "Adilabad",
        "state": "Telangana",
        "min_price": "Rs. 6,900 / qtl",
        "max_price": "Rs. 7,350 / qtl",
        "modal_price": "Rs. 7,120 / qtl",
        "price": "Rs. 7,120 / qtl",
        "change": "-0.6%",
        "update_date": "Demo Snapshot",
    },
    {
        "commodity": "Turmeric (Finger)",
        "market": "Duggirala",
        "state": "Andhra Pradesh",
        "min_price": "Rs. 13,100 / qtl",
        "max_price": "Rs. 14,400 / qtl",
        "modal_price": "Rs. 13,800 / qtl",
        "price": "Rs. 13,800 / qtl",
        "change": "+3.1%",
        "update_date": "Demo Snapshot",
    },
    {
        "commodity": "Rohu Fish (Fresh)",
        "market": "Machilipatnam",
        "state": "Andhra Pradesh",
        "min_price": "Rs. 130 / kg",
        "max_price": "Rs. 160 / kg",
        "modal_price": "Rs. 145 / kg",
        "price": "Rs. 145 / kg",
        "change": "+1.2%",
        "update_date": "Demo Snapshot",
    },
]


def fetch_market_updates(
    commodity: Optional[str] = None,
    location: Optional[str] = None,
) -> dict:
    """
    Fetches live Agmarknet market prices from api.data.gov.in when DATA_GOV_API_KEY
    is configured. Otherwise returns clearly labeled demo reference data.
    """
    if settings.DATA_GOV_API_KEY:
        try:
            params = {
                "api-key": settings.DATA_GOV_API_KEY,
                "format": "json",
                "limit": 20,
            }
            if commodity:
                params["filters[commodity]"] = commodity
            if location:
                params["filters[market]"] = location

            url = f"https://api.data.gov.in/resource/{AGMARKNET_RESOURCE_ID}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                records = resp.json().get("records", [])

            if records:
                items = [
                    {
                        "commodity": r.get("commodity", "Unknown"),
                        "market": r.get("market", "Unknown"),
                        "state": r.get("state", ""),
                        "min_price": f"Rs. {r.get('min_price', '-')} / qtl",
                        "max_price": f"Rs. {r.get('max_price', '-')} / qtl",
                        "modal_price": f"Rs. {r.get('modal_price', '-')} / qtl",
                        "price": f"Rs. {r.get('modal_price', '-')} / qtl",
                        "change": "Live",
                        "update_date": r.get("arrival_date", ""),
                    }
                    for r in records
                ]
                return {
                    "is_live": True,
                    "is_demo": False,
                    "provider": "Agmarknet (api.data.gov.in)",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "demo_label": "Live Agmarknet Mandi Data",
                    "items": items,
                }
        except Exception as exc:
            logger.warning("Agmarknet API call failed, falling back to demo reference: %s", exc)

    filtered = DEMO_MANDI_RECORDS
    if commodity and commodity.strip():
        q = commodity.strip().lower()
        filtered = [r for r in filtered if q in r["commodity"].lower()]
    if location and location.strip():
        loc = location.strip().lower()
        filtered = [r for r in filtered if loc in r["market"].lower() or loc in r["state"].lower()]

    return {
        "is_live": False,
        "is_demo": True,
        "provider": "Demo Mandi Reference (Set DATA_GOV_API_KEY for live Agmarknet)",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "demo_label": "Demo Mandi Reference Data • Verify live prices on enam.gov.in",
        "items": filtered,
    }
