import uuid
from datetime import date, datetime
from pydantic import BaseModel, field_validator
from app.models.trip import AccommodationType, TravelMethod


class TripCreate(BaseModel):
    destination: str
    latitude: float | None = None
    longitude: float | None = None
    country_code: str | None = None
    start_date: date
    end_date: date
    accommodation: AccommodationType
    travel_method: TravelMethod
    travelers: int = 1
    notes: str | None = None

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be on or after start_date")
        return v

    @field_validator("travelers")
    @classmethod
    def travelers_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("travelers must be at least 1")
        return v


class TripUpdate(BaseModel):
    destination: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    accommodation: AccommodationType | None = None
    travel_method: TravelMethod | None = None
    travelers: int | None = None
    notes: str | None = None


class TripResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    destination: str
    latitude: float | None
    longitude: float | None
    country_code: str | None
    start_date: date
    end_date: date
    accommodation: AccommodationType
    travel_method: TravelMethod
    travelers: int
    notes: str | None
    duration_days: int
    created_at: datetime

    model_config = {"from_attributes": True}
