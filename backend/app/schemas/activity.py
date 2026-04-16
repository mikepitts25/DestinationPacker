import uuid
from pydantic import BaseModel
from app.models.activity import ActivityType


class ActivityResponse(BaseModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    activity_name: str
    activity_type: ActivityType
    description: str | None
    source: str
    external_id: str | None
    photo_url: str | None
    selected: bool

    model_config = {"from_attributes": True}


class ActivityToggle(BaseModel):
    selected: bool


class ActivityAdd(BaseModel):
    activity_name: str
    activity_type: ActivityType
    description: str | None = None
