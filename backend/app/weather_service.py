import logging
from datetime import datetime, timezone
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

CITY_COORDS = {
    "Vijayawada": (16.5062, 80.6480),
    "Guntur": (16.3067, 80.4365),
    "Visakhapatnam": (17.6868, 83.2185),
    "Hyderabad": (17.3850, 78.4867),
}

WMO_CONDITIONS = {
    0: "Sunny & Clear",
    1: "Partly Cloudy",
    2: "Partly Cloudy",
    3: "Light Clouds",
    45: "Foggy",
    48: "Foggy",
    51: "Light Rain",
    53: "Light Rain",
    55: "Moderate Rain",
    61: "Light Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    80: "Light Rain",
    81: "Moderate Rain",
    95: "Thunderstorm",
}


def _wmo_to_text(code: Optional[int]) -> str:
    if code is None:
        return "Partly Cloudy"
    return WMO_CONDITIONS.get(int(code), "Partly Cloudy")


def fetch_weather(
    city: str = "Vijayawada",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> dict:
    """
    Fetches live weather from Open-Meteo (https://open-meteo.com).
    Falls back to clearly labeled demo data if the network/API is unreachable.
    """
    target_lat, target_lon = (
        (lat, lon) if lat is not None and lon is not None else CITY_COORDS.get(city, CITY_COORDS["Vijayawada"])
    )

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={target_lat}&longitude={target_lon}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
        f"&daily=weather_code,temperature_2m_max,precipitation_probability_max"
        f"&timezone=Asia%2FKolkata&forecast_days=5"
    )

    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()

        cur = data.get("current", {})
        daily = data.get("daily", {})
        dates = daily.get("time", [])
        temps = daily.get("temperature_2m_max", [])
        codes = daily.get("weather_code", [])
        rain_probs = daily.get("precipitation_probability_max", [])

        forecast = []
        for idx, d_str in enumerate(dates[:5]):
            day_name = datetime.strptime(d_str, "%Y-%m-%d").strftime("%a")
            forecast.append({
                "day": day_name,
                "date": d_str,
                "temp": round(temps[idx]) if idx < len(temps) else 28,
                "condition": _wmo_to_text(codes[idx] if idx < len(codes) else 1),
                "rain_prob": f"{rain_probs[idx]}%" if idx < len(rain_probs) and rain_probs[idx] is not None else "0%",
            })

        return {
            "city": city,
            "coordinates": {"lat": target_lat, "lon": target_lon},
            "is_live": True,
            "is_demo": False,
            "provider": "Open-Meteo (api.open-meteo.com)",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "demo_label": "Live Weather • Open-Meteo",
            "current": {
                "temp": round(cur.get("temperature_2m", 28)),
                "condition": _wmo_to_text(cur.get("weather_code")),
                "humidity": f"{cur.get('relative_humidity_2m', 60)}%",
                "wind": f"{round(cur.get('wind_speed_10m', 10))} km/h",
                "precipitation_mm": cur.get("precipitation", 0.0),
            },
            "forecast": forecast,
        }
    except Exception as exc:
        logger.warning("Open-Meteo fetch failed, using clearly labeled demo weather: %s", exc)
        return {
            "city": city,
            "coordinates": {"lat": target_lat, "lon": target_lon},
            "is_live": False,
            "is_demo": True,
            "provider": "Demo Weather Fallback (Open-Meteo unreachable)",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "demo_label": "Demo Data (Live Open-Meteo feed unavailable in offline mode)",
            "current": {
                "temp": 28,
                "condition": "Partly Cloudy",
                "humidity": "64%",
                "wind": "12 km/h",
                "precipitation_mm": 0.0,
            },
            "forecast": [
                {"day": "Mon", "temp": 27, "condition": "Partly Cloudy", "rain_prob": "10%"},
                {"day": "Tue", "temp": 29, "condition": "Sunny", "rain_prob": "5%"},
                {"day": "Wed", "temp": 30, "condition": "Warm", "rain_prob": "5%"},
                {"day": "Thu", "temp": 29, "condition": "Light Rain", "rain_prob": "45%"},
                {"day": "Fri", "temp": 28, "condition": "Partly Cloudy", "rain_prob": "20%"},
            ],
        }
