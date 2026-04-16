from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import User, SubscriptionTier
from app.schemas.user import (
    UserRegister, UserLogin, UserUpdate, UserResponse, TokenResponse, SubscriptionUpdate,
)
from app.middleware.auth import (
    get_current_user, hash_password, verify_password, create_access_token,
)

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
