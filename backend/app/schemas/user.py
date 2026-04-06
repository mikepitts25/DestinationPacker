import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import SubscriptionTier


class UserCreate(BaseModel):
    firebase_uid: str
    email: EmailStr
    display_name: str | None = None


class UserUpdate(BaseModel):
    display_name: str | None = None
    preferences: dict | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    firebase_uid: str
    email: str
    display_name: str | None
    subscription: SubscriptionTier
    preferences: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionUpdate(BaseModel):
    subscription: SubscriptionTier
