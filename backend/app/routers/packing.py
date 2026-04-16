from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import User, SubscriptionTier
from app.models.trip import Trip
from app.models.packing_item import PackingItem, ItemSource
from app.models.activity import TripActivity
from app.schemas.packing import (
    PackingItemCreate, PackingItemUpdate, PackingItemResponse, PackingListResponse
)
from app.middleware.auth import get_current_user
from app.services.rule_engine import generate_packing_list, classify_weather
from app.services.ai_service import generate_ai_packing_list
from app.services.weather_service import get_forecast

router = APIRouter(prefix="/trips/{trip_id}/packing", tags=["packing"])


async def _get_trip_or_404(trip_id: str, user_id, db: AsyncSession) -> Trip:
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == user_id)
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.get("/", response_model=PackingListResponse)
async def get_packing_list(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_trip_or_404(trip_id, current_user.id, db)

    result = await db.execute(
        select(PackingItem)
        .where(PackingItem.trip_id == trip.id)
        .order_by(PackingItem.category, PackingItem.item_name)
    )
    items = result.scalars().all()
    categories = sorted(set(item.category for item in items))

    return PackingListResponse(
        trip_id=trip.id,
        items=items,
        categories=categories,
        total_items=len(items),
        packed_items=sum(1 for i in items if i.packed),
    )


@router.post("/generate", response_model=PackingListResponse)
async def generate_list(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate (or re-generate) the packing list for a trip.
    - Free users get the rule-based engine.
    - Premium users get the Claude AI engine (with rule engine as fallback).
    Removes all existing rule_engine and ai items before re-generating.
    User-added items are preserved.
    """
    trip = await _get_trip_or_404(trip_id, current_user.id, db)

    # Fetch weather
    weather_conditions: list[str] = []
    weather_summary = "Unknown weather"
    if trip.latitude and trip.longitude:
        forecast = await get_forecast(trip.latitude, trip.longitude, trip.destination)
        if forecast:
            weather_conditions = forecast.conditions
            weather_summary = forecast.summary

    # Get selected activity types
    act_result = await db.execute(
        select(TripActivity).where(
            TripActivity.trip_id == trip.id,
            TripActivity.selected == True,  # noqa: E712
        )
    )
    selected_activities = act_result.scalars().all()
    activity_types = list({a.activity_type.value for a in selected_activities})
    activity_names = [a.activity_name for a in selected_activities]

    # Remove existing auto-generated items (preserve user_added)
    existing_result = await db.execute(
        select(PackingItem).where(
            PackingItem.trip_id == trip.id,
            PackingItem.source.in_([ItemSource.rule_engine, ItemSource.ai, ItemSource.activity]),
        )
    )
    for item in existing_result.scalars().all():
        await db.delete(item)
    await db.flush()

    # Generate recommendations
    if current_user.subscription == SubscriptionTier.premium:
        recs = await generate_ai_packing_list(trip, weather_summary, activity_names)
        if not recs:
            recs = generate_packing_list(trip, weather_conditions, activity_types)
    else:
        recs = generate_packing_list(trip, weather_conditions, activity_types)

    # Build activity_id lookup
    activity_type_to_id: dict[str, str] = {
        a.activity_type.value: str(a.id) for a in selected_activities
    }

    # Persist items
    for rec in recs:
        source = ItemSource.ai if rec.source == "ai" else (
            ItemSource.activity if rec.source == "activity" else ItemSource.rule_engine
        )
        activity_id = None
        if rec.activity_type:
            activity_id = activity_type_to_id.get(rec.activity_type)

        db.add(PackingItem(
            trip_id=trip.id,
            category=rec.category,
            item_name=rec.item_name,
            quantity=rec.quantity,
            essential=rec.essential,
            source=source,
            activity_id=activity_id,
        ))

    await db.commit()

    # Return updated list
    result = await db.execute(
        select(PackingItem)
        .where(PackingItem.trip_id == trip.id)
        .order_by(PackingItem.category, PackingItem.item_name)
    )
    items = result.scalars().all()
    categories = sorted(set(item.category for item in items))

    return PackingListResponse(
        trip_id=trip.id,
        items=items,
        categories=categories,
        total_items=len(items),
        packed_items=sum(1 for i in items if i.packed),
    )


@router.patch("/{item_id}", response_model=PackingItemResponse)
async def update_item(
    trip_id: str,
    item_id: str,
    payload: PackingItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_trip_or_404(trip_id, current_user.id, db)

    result = await db.execute(
        select(PackingItem).where(PackingItem.id == item_id, PackingItem.trip_id == trip_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = payload.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.post("/", response_model=PackingItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    trip_id: str,
    payload: PackingItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_trip_or_404(trip_id, current_user.id, db)
    item = PackingItem(
        trip_id=trip_id,
        category=payload.category,
        item_name=payload.item_name,
        quantity=payload.quantity,
        essential=payload.essential,
        source=ItemSource.user_added,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    trip_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_trip_or_404(trip_id, current_user.id, db)
    result = await db.execute(
        select(PackingItem).where(PackingItem.id == item_id, PackingItem.trip_id == trip_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
