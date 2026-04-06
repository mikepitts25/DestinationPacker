import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import SubscriptionTier


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserUpdate(BaseModel):
    display_name: str | None = None
    preferences: dict | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None
    subscription: SubscriptionTier
    preferences: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionUpdate(BaseModel):
    subscription: SubscriptionTier
