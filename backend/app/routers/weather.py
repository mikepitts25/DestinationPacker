from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.models.user import User
from app.middleware.auth import get_current_user
from app.services.weather_service import get_forecast, WeatherDay
from app.services.places_service import autocomplete_destination, get_place_details

router = APIRouter(prefix="/weather", tags=["weather"])


class WeatherDayResponse(BaseModel):
    date: str
    temp_min: float
    temp_max: float
    avg_temp: float
    description: str
    has_rain: bool
    has_snow: bool
    icon: str


class WeatherForecastResponse(BaseModel):
    destination: str
    days: list[WeatherDayResponse]
    conditions: list[str]
    summary: str


class PlaceAutocompleteResponse(BaseModel):
    place_id: str
    description: str


class PlaceDetailResponse(BaseModel):
    name: str | None
    lat: float | None
    lon: float | None
    country_code: str | None


@router.get("/forecast", response_model=WeatherForecastResponse)
async def get_weather_forecast(
    lat: float,
    lon: float,
    destination: str,
    _: User = Depends(get_current_user),
):
    forecast = await get_forecast(lat, lon, destination)
    if not forecast:
        raise HTTPException(status_code=503, detail="Weather data unavailable")

    return WeatherForecastResponse(
        destination=forecast.destination,
        days=[WeatherDayResponse(**vars(d)) for d in forecast.days],
        conditions=forecast.conditions,
        summary=forecast.summary,
    )


@router.get("/places/autocomplete", response_model=list[PlaceAutocompleteResponse])
async def places_autocomplete(
    query: str,
    _: User = Depends(get_current_user),
):
    if len(query) < 2:
        return []
    results = await autocomplete_destination(query)
    return results


@router.get("/places/details", response_model=PlaceDetailResponse)
async def place_details(
    place_id: str,
    _: User = Depends(get_current_user),
):
    details = await get_place_details(place_id)
    if not details:
        raise HTTPException(status_code=404, detail="Place not found")
    return details
