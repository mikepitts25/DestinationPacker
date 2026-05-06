import random
import smtplib
import logging
from email.mime.text import MIMEText

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.db.database import get_db
from app.models.user import User, SubscriptionTier
from app.schemas.user import (
    UserRegister, UserLogin, UserUpdate, UserResponse, TokenResponse, SubscriptionUpdate,
)
from app.middleware.auth import (
    get_current_user, hash_password, verify_password, create_access_token,
)

logger = logging.getLogger(__name__)

RESET_CODE_TTL = 15 * 60  # 15 minutes

def _redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)

def _send_reset_email(to: str, code: str) -> None:
    """Send a password reset code via SMTP (runs in thread pool)."""
    from_addr = settings.smtp_from or settings.smtp_user
    msg = MIMEText(
        f"Your DestinationPacker password reset code is:\n\n"
        f"  {code}\n\n"
        f"This code expires in 15 minutes. If you didn't request this, ignore this email.",
        "plain",
    )
    msg["Subject"] = "DestinationPacker — Password Reset Code"
    msg["From"] = from_addr
    msg["To"] = to
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(from_addr, [to], msg.as_string())

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user with email + password."""
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password, returns JWT."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    if payload.preferences is not None:
        current_user.preferences = {**current_user.preferences, **payload.preferences}
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/subscription", response_model=UserResponse)
async def update_subscription(
    payload: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update subscription tier. In production this would be handled by
    RevenueCat webhooks; this endpoint enables dev/testing and will
    later be locked behind webhook verification.
    """
    current_user.subscription = payload.subscription
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/reset-password/request", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """Generate a 6-digit reset code and email it (or log it in dev)."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Always return 204 to avoid email enumeration
    if not user:
        return

    code = f"{random.randint(0, 999999):06d}"
    redis = _redis()
    await redis.setex(f"reset:{payload.email}", RESET_CODE_TTL, code)

    if settings.email_enabled:
        import asyncio
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, _send_reset_email, payload.email, code)
        except Exception as e:
            logger.error("Failed to send reset email to %s: %s", payload.email, e)
    else:
        logger.info("PASSWORD RESET CODE for %s: %s", payload.email, code)


@router.post("/reset-password/confirm", response_model=TokenResponse)
async def confirm_password_reset(payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """Verify the reset code and set the new password."""
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    redis = _redis()
    stored_code = await redis.get(f"reset:{payload.email}")
    if not stored_code or stored_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    await db.refresh(user)
    await redis.delete(f"reset:{payload.email}")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/subscription/webhook")
async def revenuecat_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    RevenueCat webhook to update subscription status.
    Called by RevenueCat when a subscription changes.
    """
    event = payload.get("event", {})
    event_type = event.get("type", "")
    app_user_id = event.get("app_user_id", "")

    result = await db.execute(select(User).where(User.id == app_user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {"status": "user_not_found"}

    if event_type in ("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"):
        user.subscription = SubscriptionTier.premium
    elif event_type in ("EXPIRATION", "CANCELLATION", "BILLING_ISSUE"):
        user.subscription = SubscriptionTier.free

    await db.commit()
    return {"status": "ok"}
