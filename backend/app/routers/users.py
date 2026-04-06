from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import User, SubscriptionTier
from app.schemas.user import UserCreate, UserUpdate, UserResponse, SubscriptionUpdate
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user (called after Firebase sign-in)."""
    result = await db.execute(select(User).where(User.firebase_uid == payload.firebase_uid))
    existing = result.scalar_one_or_none()
    if existing:
        return existing  # Idempotent — return existing user

    user = User(
        firebase_uid=payload.firebase_uid,
        email=payload.email,
        display_name=payload.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


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


@router.post("/subscription/webhook")
async def revenuecat_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    RevenueCat webhook to update subscription status.
    Called by RevenueCat when a subscription changes.
    """
    # In production, verify the RevenueCat webhook signature
    event = payload.get("event", {})
    event_type = event.get("type", "")
    app_user_id = event.get("app_user_id", "")

    result = await db.execute(select(User).where(User.firebase_uid == app_user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {"status": "user_not_found"}

    if event_type in ("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"):
        user.subscription = SubscriptionTier.premium
    elif event_type in ("EXPIRATION", "CANCELLATION", "BILLING_ISSUE"):
        user.subscription = SubscriptionTier.free

    await db.commit()
    return {"status": "ok"}
