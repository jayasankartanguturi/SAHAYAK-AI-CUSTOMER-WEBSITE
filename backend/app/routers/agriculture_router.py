from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..services.agmarknet_service import (
    compare_commodity_markets,
    fetch_agriculture_prices,
    list_commodities,
    list_markets,
)

router = APIRouter(prefix="/api/agriculture", tags=["Agriculture Market (Agmarknet)"])


@router.get("/markets")
def get_agriculture_markets(
    state: Optional[str] = Query(default=None, max_length=100),
    district: Optional[str] = Query(default=None, max_length=100),
    search: Optional[str] = Query(default=None, max_length=100),
):
    try:
        return list_markets(state=state, district=district, search=search)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/commodities")
def get_agriculture_commodities(
    search: Optional[str] = Query(default=None, max_length=100),
):
    try:
        return list_commodities(search=search)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/prices")
def get_agriculture_prices(
    state: Optional[str] = Query(default=None, max_length=100),
    district: Optional[str] = Query(default=None, max_length=100),
    market: Optional[str] = Query(default=None, max_length=120),
    commodity: Optional[str] = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    refresh: bool = Query(default=False),
):
    if not any((state, district, market, commodity)):
        raise HTTPException(
            status_code=400,
            detail="Provide at least one filter: state, district, market, or commodity.",
        )

    return fetch_agriculture_prices(
        state=state,
        district=district,
        market=market,
        commodity=commodity,
        limit=limit,
        force_refresh=refresh,
    )


@router.get("/compare")
def compare_agriculture_prices(
    commodity: str = Query(..., min_length=2, max_length=120),
    state: Optional[str] = Query(default=None, max_length=100),
    markets: Optional[str] = Query(default=None, max_length=400, description="Comma-separated market names"),
    refresh: bool = Query(default=False),
):
    market_list = [m.strip() for m in markets.split(",") if m.strip()] if markets else None
    return compare_commodity_markets(
        commodity=commodity.strip(),
        state=state.strip() if state else None,
        markets=market_list,
        force_refresh=refresh,
    )
