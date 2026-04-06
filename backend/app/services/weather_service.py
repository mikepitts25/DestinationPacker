"""
Weather service — uses Open-Meteo (free, no API key, open source).
https://open-meteo.com/
"""
import json
import hashlib
from dataclasses import dataclass
from datetime import datetime

import httpx
import redis.asyncio as aioredis

from app.config import settings


@dataclass
class WeatherDay:
    date: str
    temp_min: float
    temp_max: float
    avg_temp: float
    description: str
    has_rain: bool
    has_snow: bool
    icon: str


@dataclass
class WeatherForecast:
    destination: str
    days: list[WeatherDay]
    conditions: list[str]  # e.g. ['rain', 'hot'] for the rule engine
    summary: str  # human-readable for AI prompt


_redis_client: aioredis.Redis | None = None

CACHE_TTL_SECONDS = 3 * 60 * 60  # 3 hours


def _get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


def _cache_key(lat: float, lon: float) -> str:
    key = f"weather:{lat:.3f}:{lon:.3f}"
    return hashlib.md5(key.encode()).hexdigest()


# WMO weather codes → human descriptions + rain/snow flags
_WMO_DESCRIPTIONS: dict[int, tuple[str, bool, bool]] = {
    0: ("Clear sky", False, False),
    1: ("Mainly clear", False, False),
    2: ("Partly cloudy", False, False),
    3: ("Overcast", False, False),
    45: ("Foggy", False, False),
    48: ("Freezing fog", False, False),
    51: ("Light drizzle", True, False),
    53: ("Moderate drizzle", True, False),
    55: ("Dense drizzle", True, False),
    56: ("Freezing drizzle", True, False),
    57: ("Heavy freezing drizzle", True, False),
    61: ("Slight rain", True, False),
    63: ("Moderate rain", True, False),
    65: ("Heavy rain", True, False),
    66: ("Freezing rain", True, False),
    67: ("Heavy freezing rain", True, False),
    71: ("Slight snow", False, True),
    73: ("Moderate snow", False, True),
    75: ("Heavy snow", False, True),
    77: ("Snow grains", False, True),
    80: ("Slight rain showers", True, False),
    81: ("Moderate rain showers", True, False),
    82: ("Violent rain showers", True, False),
    85: ("Slight snow showers", False, True),
    86: ("Heavy snow showers", False, True),
    95: ("Thunderstorm", True, False),
    96: ("Thunderstorm with hail", True, False),
    99: ("Thunderstorm with heavy hail", True, False),
}


async def get_forecast(lat: float, lon: float, destination: str) -> WeatherForecast | None:
    """
    Fetch a 7-day forecast from Open-Meteo (free, no API key needed).
    Results are cached in Valkey/Redis for 3 hours.
    """
    cache_key = _cache_key(lat, lon)
    redis = _get_redis()

    # Try cache first
    try:
        cached = await redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return _parse_forecast(destination, data)
    except Exception:
        pass  # Redis down — fetch fresh

    # Open-Meteo free API — no key required
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum",
        "timezone": "auto",
        "forecast_days": 7,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError:
            return None

    # Cache the raw response
    try:
        await redis.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(data))
    except Exception:
        pass  # Redis down — still return data

    return _parse_forecast(destination, data)


def _parse_forecast(destination: str, data: dict) -> WeatherForecast:
    daily = data.get("daily", {})
    dates = daily.get("time", [])
    temp_maxes = daily.get("temperature_2m_max", [])
    temp_mins = daily.get("temperature_2m_min", [])
    weather_codes = daily.get("weathercode", [])
    precip_sums = daily.get("precipitation_sum", [])

    days = []
    for i in range(min(7, len(dates))):
        temp_min = temp_mins[i]
        temp_max = temp_maxes[i]
        avg_temp = (temp_min + temp_max) / 2
        wmo_code = weather_codes[i] if i < len(weather_codes) else 0

        desc, has_rain, has_snow = _WMO_DESCRIPTIONS.get(wmo_code, ("Unknown", False, False))

        # Derive icon for the mobile app
        if has_snow:
            icon = "snow"
        elif has_rain:
            icon = "rain"
        elif avg_temp > 27:
            icon = "sunny"
        elif wmo_code <= 1:
            icon = "clear"
        else:
            icon = "cloudy"

        days.append(WeatherDay(
            date=dates[i],
            temp_min=round(temp_min, 1),
            temp_max=round(temp_max, 1),
            avg_temp=round(avg_temp, 1),
            description=desc,
            has_rain=has_rain,
            has_snow=has_snow,
            icon=icon,
        ))

    # Summarize conditions for rule engine
    from app.services.rule_engine import classify_weather
    avg_temp = sum(d.avg_temp for d in days) / len(days) if days else 20.0
    any_rain = any(d.has_rain for d in days)
    any_snow = any(d.has_snow for d in days)
    conditions = classify_weather(avg_temp, any_rain, any_snow)

    # Human-readable summary
    if days:
        temp_range = f"{min(d.temp_min for d in days):.0f}–{max(d.temp_max for d in days):.0f}°C"
    else:
        temp_range = "unknown"
    rain_str = " with rain expected" if any_rain else ""
    snow_str = " with snow expected" if any_snow else ""
    summary = f"Temperatures {temp_range}{rain_str}{snow_str}."

    return WeatherForecast(
        destination=destination,
        days=days,
        conditions=conditions,
        summary=summary,
    )
