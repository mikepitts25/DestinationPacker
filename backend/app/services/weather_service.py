"""
Weather service — fetches forecasts from OpenWeatherMap and caches in Redis.
"""
import json
import hashlib
from dataclasses import dataclass

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


async def get_forecast(lat: float, lon: float, destination: str) -> WeatherForecast | None:
    """
    Fetch a 7-day forecast for the given coordinates.
    Results are cached in Redis for 3 hours to stay within free API limits.
    """
    if not settings.openweather_api_key:
        return None

    cache_key = _cache_key(lat, lon)
    redis = _get_redis()

    # Try cache first
    cached = await redis.get(cache_key)
    if cached:
        data = json.loads(cached)
        return _parse_forecast(destination, data)

    # Fetch from OpenWeatherMap One Call 3.0
    url = "https://api.openweathermap.org/data/3.0/onecall"
    params = {
        "lat": lat,
        "lon": lon,
        "units": "metric",
        "exclude": "current,minutely,hourly,alerts",
        "appid": settings.openweather_api_key,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError:
            return None

    # Cache the raw response
    await redis.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(data))
    return _parse_forecast(destination, data)


def _parse_forecast(destination: str, data: dict) -> WeatherForecast:
    daily = data.get("daily", [])[:7]
    days = []

    for d in daily:
        import datetime
        date_str = datetime.datetime.fromtimestamp(d["dt"]).strftime("%Y-%m-%d")
        temp_min = d["temp"]["min"]
        temp_max = d["temp"]["max"]
        avg_temp = (temp_min + temp_max) / 2
        description = d["weather"][0]["description"].capitalize()
        icon = d["weather"][0]["icon"]
        weather_id = d["weather"][0]["id"]
        has_rain = weather_id < 700 and weather_id >= 200  # thunderstorm, drizzle, rain
        has_snow = 600 <= weather_id < 622

        days.append(WeatherDay(
            date=date_str,
            temp_min=round(temp_min, 1),
            temp_max=round(temp_max, 1),
            avg_temp=round(avg_temp, 1),
            description=description,
            has_rain=has_rain,
            has_snow=has_snow,
            icon=icon,
        ))

    # Summarize conditions
    from app.services.rule_engine import classify_weather
    avg_temp = sum(d.avg_temp for d in days) / len(days) if days else 20.0
    any_rain = any(d.has_rain for d in days)
    any_snow = any(d.has_snow for d in days)
    conditions = classify_weather(avg_temp, any_rain, any_snow)

    # Human-readable summary
    temp_range = f"{min(d.temp_min for d in days):.0f}–{max(d.temp_max for d in days):.0f}°C"
    rain_str = " with rain expected" if any_rain else ""
    snow_str = " with snow expected" if any_snow else ""
    summary = f"Temperatures {temp_range}{rain_str}{snow_str}."

    return WeatherForecast(
        destination=destination,
        days=days,
        conditions=conditions,
        summary=summary,
    )
