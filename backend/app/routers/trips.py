from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.user import User, SubscriptionTier
from app.models.trip import Trip
from app.schemas.trip import TripCreate, TripUpdate, TripResponse
from app.middleware.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("/", response_model=list[TripResponse])
async def list_trips(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip)
        .where(Trip.user_id == current_user.id)
        .order_by(Trip.start_date.asc())
    )
    return result.scalars().all()


@router.post("/", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    payload: TripCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Enforce free tier trip limit
    if current_user.subscription == SubscriptionTier.free:
        count_result = await db.execute(
            select(func.count()).where(Trip.user_id == current_user.id)
        )
        trip_count = count_result.scalar_one()
        if trip_count >= settings.free_trip_limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Free accounts are limited to {settings.free_trip_limit} trips. Upgrade to Premium for unlimited trips.",
            )

    trip = Trip(user_id=current_user.id, **payload.model_dump())
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_trip_or_404(trip_id, current_user.id, db)
    return trip


@router.patch("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    payload: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_trip_or_404(trip_id, current_user.id, db)
    update_data = payload.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(trip, key, value)
    await db.commit()
    await db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_trip_or_404(trip_id, current_user.id, db)
    await db.delete(trip)
    await db.commit()


async def _get_trip_or_404(trip_id: str, user_id, db: AsyncSession) -> Trip:
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == user_id)
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip
