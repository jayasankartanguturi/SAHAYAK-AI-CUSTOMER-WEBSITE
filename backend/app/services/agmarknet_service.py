import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from ..config import settings
from ..database import db_manager

logger = logging.getLogger(__name__)

AGMARKNET_FILTERS_URL = "https://api.agmarknet.gov.in/v1/daily-price-arrival/filters"
DATA_GOV_AGMARKNET_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"
DATA_GOV_BASE_URL = f"https://api.data.gov.in/resource/{DATA_GOV_AGMARKNET_RESOURCE}"

AGMARKNET_HEADERS = {
    "User-Agent": "SahayakAI-AgriMarket/1.0 (+https://agmarknet.gov.in)",
    "Accept": "application/json",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
}

DATA_GOV_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

CATALOG_TTL_SECONDS = 12 * 60 * 60  # 12 hours
PRICE_CACHE_TTL_SECONDS = 15 * 60   # 15 minutes

_catalog_cache: dict[str, Any] = {"fetched_at": 0.0, "data": None}
_price_cache: dict[str, dict[str, Any]] = {}


def _parse_numeric_price(raw: Any) -> Optional[float]:
    """Parses a price value while distinguishing unavailable/blank data from 0."""
    if raw is None:
        return None
    text = str(raw).strip().replace(",", "")
    if not text or text.lower() in ("na", "n/a", "nr", "nil", "-", "--", "null", "none"):
        return None
    try:
        val = float(text)
        return val if val >= 0 else None
    except ValueError:
        return None


def get_agmarknet_catalog(force_refresh: bool = False) -> dict[str, Any]:
    """
    Loads official States, Districts, Markets (Mandis), and Commodities from
    Agmarknet 2.0 (`api.agmarknet.gov.in/v1/daily-price-arrival/filters`) with TTL caching.
    """
    now = time.time()
    if (
        not force_refresh
        and _catalog_cache["data"] is not None
        and (now - _catalog_cache["fetched_at"]) < CATALOG_TTL_SECONDS
    ):
        return _catalog_cache["data"]

    try:
        with httpx.Client(timeout=12.0, follow_redirects=True) as client:
            resp = client.get(AGMARKNET_FILTERS_URL, headers=AGMARKNET_HEADERS)
            resp.raise_for_status()
            body = resp.json()
        raw_data = body.get("data") or {}

        states = [
            {"id": s["state_id"], "name": s["state_name"].strip()}
            for s in raw_data.get("state_data", [])
            if s.get("state_name") and "all states" not in s["state_name"].lower()
        ]
        states.sort(key=lambda x: x["name"])

        state_by_id = {s["id"]: s["name"] for s in states}

        districts = [
            {
                "id": d["id"],
                "name": d["district_name"].strip(),
                "state_id": d.get("state_id"),
                "state": state_by_id.get(d.get("state_id"), ""),
            }
            for d in raw_data.get("district_data", [])
            if d.get("district_name") and "all districts" not in d["district_name"].lower()
        ]
        district_by_id = {d["id"]: d["name"] for d in districts}

        markets = [
            {
                "id": m["id"],
                "name": m["mkt_name"].strip(),
                "state_id": m.get("state_id"),
                "state": state_by_id.get(m.get("state_id"), ""),
                "district_id": m.get("district_id"),
                "district": district_by_id.get(m.get("district_id"), ""),
            }
            for m in raw_data.get("market_data", [])
            if m.get("mkt_name") and "all markets" not in m["mkt_name"].lower()
        ]
        markets.sort(key=lambda x: (x["state"], x["name"]))

        commodities = [
            {
                "id": c["cmdt_id"],
                "name": c["cmdt_name"].strip(),
                "group_id": c.get("cmdt_group_id"),
            }
            for c in raw_data.get("cmdt_data", [])
            if c.get("cmdt_name")
        ]
        commodities.sort(key=lambda x: x["name"])

        catalog = {
            "source": "Agmarknet 2.0 (api.agmarknet.gov.in)",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "states": states,
            "districts": districts,
            "markets": markets,
            "commodities": commodities,
        }
        _catalog_cache["data"] = catalog
        _catalog_cache["fetched_at"] = now
        return catalog
    except Exception as exc:
        logger.warning("Failed to fetch Agmarknet catalog: %s", exc)
        if _catalog_cache["data"] is not None:
            return _catalog_cache["data"]
        raise RuntimeError(
            "Unable to load live market & commodity catalog from Agmarknet right now. Please try again shortly."
        ) from exc


def list_markets(
    state: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
) -> dict[str, Any]:
    catalog = get_agmarknet_catalog()
    markets = catalog["markets"]
    districts = catalog["districts"]

    if state and state.strip():
        st_q = state.strip().lower()
        markets = [m for m in markets if m["state"].lower() == st_q or st_q in m["state"].lower()]
        districts = [d for d in districts if d["state"].lower() == st_q or st_q in d["state"].lower()]

    if district and district.strip():
        dist_q = district.strip().lower()
        markets = [m for m in markets if dist_q in (m["district"] or "").lower()]

    if search and search.strip():
        q = search.strip().lower()
        markets = [
            m
            for m in markets
            if q in m["name"].lower() or q in (m["district"] or "").lower()
        ]

    return {
        "source": catalog["source"],
        "fetched_at": catalog["fetched_at"],
        "states": catalog["states"],
        "districts": districts,
        "markets": markets[:500],
        "total_markets": len(markets),
    }


def list_commodities(search: Optional[str] = None) -> dict[str, Any]:
    catalog = get_agmarknet_catalog()
    commodities = catalog["commodities"]
    if search and search.strip():
        q = search.strip().lower()
        commodities = [c for c in commodities if q in c["name"].lower()]

    return {
        "source": catalog["source"],
        "fetched_at": catalog["fetched_at"],
        "commodities": commodities,
        "total": len(commodities),
    }


def _persist_price_records(records: list[dict[str, Any]]) -> None:
    """Stores fetched live Agmarknet prices in MongoDB without duplicate records."""
    if not records:
        return
    col = db_manager.collection("agriculture_prices")
    for rec in records:
        query = {
            "state": rec["state"],
            "market": rec["market"],
            "commodity": rec["commodity"],
            "variety": rec.get("variety", ""),
            "reported_date": rec["reported_date"],
        }
        try:
            col.update_one(query, {"$set": rec}, upsert=True)
        except Exception as exc:
            logger.debug("agriculture_prices upsert warning: %s", exc)


def fetch_agriculture_prices(
    state: Optional[str] = None,
    commodity: Optional[str] = None,
    market: Optional[str] = None,
    district: Optional[str] = None,
    limit: int = 50,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """
    Fetches real reported Agmarknet mandi prices via the official data.gov.in
    Agmarknet API (Priority 1). Never returns fabricated/sample prices as live data.
    """
    state_clean = (state or "").strip()
    commodity_clean = (commodity or "").strip()
    market_clean = (market or "").strip()
    district_clean = (district or "").strip()
    safe_limit = max(1, min(int(limit), 100))

    cache_key = f"{state_clean.lower()}|{district_clean.lower()}|{market_clean.lower()}|{commodity_clean.lower()}|{safe_limit}"
    now = time.time()

    if not force_refresh and cache_key in _price_cache:
        entry = _price_cache[cache_key]
        if (now - entry["cached_at"]) < PRICE_CACHE_TTL_SECONDS:
            resp_copy = dict(entry["payload"])
            resp_copy["cached"] = True
            return resp_copy

    if not settings.DATA_GOV_API_KEY:
        return {
            "available": False,
            "source_status": "api_key_required",
            "source": "Agmarknet / Open Government Data (data.gov.in)",
            "unit": "INR per quintal",
            "cached": False,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "message": (
                "Live Agmarknet price retrieval requires a free DATA_GOV_API_KEY in backend/.env. "
                "Agmarknet 2.0's web report now enforces CAPTCHA verification, so the official "
                "data.gov.in Agmarknet API is used for reliable live prices without inventing sample data."
            ),
            "items": [],
            "total": 0,
        }

    params: dict[str, Any] = {
        "api-key": settings.DATA_GOV_API_KEY,
        "format": "json",
        "limit": safe_limit,
    }
    if state_clean:
        params["filters[state]"] = state_clean
    if district_clean:
        params["filters[district]"] = district_clean
    if market_clean:
        params["filters[market]"] = market_clean
    if commodity_clean:
        params["filters[commodity]"] = commodity_clean

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(DATA_GOV_BASE_URL, params=params, headers=DATA_GOV_HEADERS)
            if resp.status_code in (401, 403):
                raise PermissionError("DATA_GOV_API_KEY was rejected by data.gov.in.")
            resp.raise_for_status()
            body = resp.json()
    except PermissionError as exc:
        logger.warning("data.gov.in auth error: %s", exc)
        return {
            "available": False,
            "source_status": "invalid_api_key",
            "source": "Agmarknet (api.data.gov.in)",
            "unit": "INR per quintal",
            "cached": False,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "message": "Your DATA_GOV_API_KEY was rejected by data.gov.in. Verify the key in backend/.env.",
            "items": [],
            "total": 0,
        }
    except Exception as exc:
        logger.warning("data.gov.in Agmarknet request failed: %s", exc)
        return {
            "available": False,
            "source_status": "upstream_unavailable",
            "source": "Agmarknet (api.data.gov.in)",
            "unit": "INR per quintal",
            "cached": False,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "message": "Agmarknet price service is temporarily unreachable. Please try refreshing in a moment.",
            "items": [],
            "total": 0,
        }

    raw_records = body.get("records") or []
    fetched_iso = datetime.now(timezone.utc).isoformat()
    items: list[dict[str, Any]] = []

    for r in raw_records:
        min_p = _parse_numeric_price(r.get("min_price"))
        max_p = _parse_numeric_price(r.get("max_price"))
        modal_p = _parse_numeric_price(r.get("modal_price"))
        items.append(
            {
                "commodity": (r.get("commodity") or commodity_clean or "Unknown").strip(),
                "variety": (r.get("variety") or "").strip(),
                "grade": (r.get("grade") or "").strip(),
                "state": (r.get("state") or state_clean).strip(),
                "district": (r.get("district") or district_clean).strip(),
                "market": (r.get("market") or market_clean or "Unknown").strip(),
                "min_price": min_p,
                "max_price": max_p,
                "modal_price": modal_p,
                "unit": "INR per quintal",
                "reported_date": (r.get("arrival_date") or "").strip() or None,
                "source": "Agmarknet (api.data.gov.in)",
                "last_fetched_at": fetched_iso,
            }
        )

    _persist_price_records(items)

    payload = {
        "available": True,
        "source_status": "live",
        "source": "Agmarknet (api.data.gov.in)",
        "unit": "INR per quintal",
        "cached": False,
        "fetched_at": fetched_iso,
        "message": (
            f"Found {len(items)} reported mandi price record(s)."
            if items
            else "No mandi prices were reported for this exact filter combination. Try broadening the market or commodity."
        ),
        "items": items,
        "total": len(items),
    }

    _price_cache[cache_key] = {"cached_at": now, "payload": payload}
    return payload


def compare_commodity_markets(
    commodity: str,
    state: Optional[str] = None,
    markets: Optional[list[str]] = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """
    Compares reported prices for a single commodity across multiple markets and highlights
    the market with the highest reported modal/max price (with a clear non-guarantee disclaimer).
    """
    result = fetch_agriculture_prices(
        state=state,
        commodity=commodity,
        limit=100,
        force_refresh=force_refresh,
    )
    if not result.get("available"):
        return {
            **result,
            "commodity": commodity,
            "highest_reported_market": None,
            "disclaimer": "Reported mandi prices are informational and do not guarantee the final selling price.",
        }

    items = result["items"]
    if markets:
        wanted = {m.strip().lower() for m in markets if m.strip()}
        if wanted:
            items = [i for i in items if i["market"].lower() in wanted]

    # Deduplicate by market keeping the most recent / highest modal entry
    by_market: dict[str, dict[str, Any]] = {}
    for item in items:
        key = f"{item['state'].lower()}|{item['market'].lower()}"
        existing = by_market.get(key)
        item_score = item["modal_price"] if item["modal_price"] is not None else (item["max_price"] or -1)
        existing_score = (
            (existing["modal_price"] if existing["modal_price"] is not None else (existing["max_price"] or -1))
            if existing
            else -2
        )
        if existing is None or item_score > existing_score:
            by_market[key] = item

    compared = sorted(
        by_market.values(),
        key=lambda x: (
            x["modal_price"] if x["modal_price"] is not None else -1,
            x["max_price"] if x["max_price"] is not None else -1,
        ),
        reverse=True,
    )

    highest = compared[0] if compared and (compared[0]["modal_price"] is not None or compared[0]["max_price"] is not None) else None

    return {
        "available": True,
        "source_status": result["source_status"],
        "source": result["source"],
        "unit": result["unit"],
        "cached": result["cached"],
        "fetched_at": result["fetched_at"],
        "commodity": commodity,
        "state": state or "All States",
        "items": compared,
        "total_markets": len(compared),
        "highest_reported_market": highest,
        "disclaimer": (
            "Highest reported price reflects the latest available Agmarknet mandi record and "
            "does not guarantee the exact price a farmer will receive, as final rates depend on crop grade, moisture, and daily auction demand."
        ),
    }
