from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.user import User, SubscriptionTier
from app.models.trip import Trip
from app.models.activity import TripActivity, ActivityType
from app.models.packing_item import PackingItem, ItemSource
from app.schemas.activity import ActivityResponse, ActivityToggle, ActivityAdd
from app.middleware.auth import get_current_user
from app.services.places_service import get_nearby_activities
from app.services.ai_service import generate_ai_activities, get_activity_packing_additions
from app.services.rule_engine import generate_packing_list, ACTIVITY_RULES

router = APIRouter(prefix="/trips/{trip_id}/activities", tags=["activities"])


async def _get_trip_or_404(trip_id: str, user_id, db: AsyncSession) -> Trip:
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == user_id)
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.get("/", response_model=list[ActivityResponse])
async def list_activities(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_trip_or_404(trip_id, current_user.id, db)
    result = await db.execute(
        select(TripActivity)
        .where(TripActivity.trip_id == trip.id)
        .order_by(TripActivity.activity_name)
    )
    return result.scalars().all()


@router.post("/fetch", response_model=list[ActivityResponse])
async def fetch_and_store_activities(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch activity suggestions (Google Places + optional AI for premium)
    and store them as trip activities. Idempotent — clears existing non-user-added activities first.
    """
    trip = await _get_trip_or_404(trip_id, current_user.id, db)

    # Clear existing auto-fetched activities
    existing = await db.execute(
        select(TripActivity).where(
            TripActivity.trip_id == trip.id,
            TripActivity.source.in_(["google_places", "openstreetmap", "ai_suggested", "suggested", "souvenir_guide"]),
        )
    )
    for act in existing.scalars().all():
        await db.delete(act)
    await db.flush()

    # Get activities from Google Places
    places_activities = []
    if trip.latitude and trip.longitude:
        places_activities = await get_nearby_activities(trip.latitude, trip.longitude, trip.destination)

    # Get AI activities for premium users
    ai_activities = []
    if current_user.subscription == SubscriptionTier.premium:
        user_interests = current_user.preferences.get("interests", [])
        ai_activities = await generate_ai_activities(
            trip.destination,
            str(trip.start_date),
            trip.duration_days,
            user_interests,
        )

    # Combine, prefer AI suggestions + places
    all_activities = ai_activities + places_activities
    seen_names: set[str] = set()

    for act_data in all_activities[:15]:
        name = act_data.get("activity_name", "")
        if not name or name.lower() in seen_names:
            continue
        seen_names.add(name.lower())

        try:
            activity_type = ActivityType(act_data.get("activity_type", "cultural"))
        except ValueError:
            activity_type = ActivityType.cultural

        db.add(TripActivity(
            trip_id=trip.id,
            activity_name=name,
            activity_type=activity_type,
            description=act_data.get("description"),
            source=act_data.get("source", "suggested"),
            external_id=act_data.get("external_id"),
            photo_url=act_data.get("photo_url"),
        ))

    await db.commit()

    result = await db.execute(
        select(TripActivity).where(TripActivity.trip_id == trip.id)
    )
    return result.scalars().all()


@router.patch("/{activity_id}/toggle", response_model=ActivityResponse)
async def toggle_activity(
    trip_id: str,
    activity_id: str,
    payload: ActivityToggle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Select or deselect an activity.
    When selected, adds relevant packing items to the list.
    When deselected, removes activity-linked packing items.
    """
    trip = await _get_trip_or_404(trip_id, current_user.id, db)

    act_result = await db.execute(
        select(TripActivity).where(TripActivity.id == activity_id, TripActivity.trip_id == trip.id)
    )
    activity = act_result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    was_selected = activity.selected
    activity.selected = payload.selected

    if payload.selected and not was_selected:
        # Add packing items for this activity
        activity_type = activity.activity_type.value

        # Get existing item names to avoid duplicates
        existing_result = await db.execute(
            select(PackingItem.item_name).where(PackingItem.trip_id == trip.id)
        )
        existing_names = {row[0].lower() for row in existing_result.all()}

        # Rule engine items for this activity
        rule_items = ACTIVITY_RULES.get(activity_type, [])
        for category, item_name, qty, essential in rule_items:
            if item_name.lower() not in existing_names:
                db.add(PackingItem(
                    trip_id=trip.id,
                    activity_id=activity.id,
                    category=category,
                    item_name=item_name,
                    quantity=qty,
                    essential=essential,
                    source=ItemSource.activity,
                ))
                existing_names.add(item_name.lower())

        # AI additions for premium users
        if current_user.subscription == SubscriptionTier.premium:
            ai_additions = await get_activity_packing_additions(
                trip.destination,
                activity.activity_name,
                activity_type,
                list(existing_names),
            )
            for rec in ai_additions:
                if rec.item_name.lower() not in existing_names:
                    db.add(PackingItem(
                        trip_id=trip.id,
                        activity_id=activity.id,
                        category=rec.category,
                        item_name=rec.item_name,
                        quantity=rec.quantity,
                        essential=rec.essential,
                        source=ItemSource.ai,
                    ))

    elif not payload.selected and was_selected:
        # Remove packing items linked to this activity
        items_result = await db.execute(
            select(PackingItem).where(
                PackingItem.trip_id == trip.id,
                PackingItem.activity_id == activity.id,
            )
        )
        for item in items_result.scalars().all():
            await db.delete(item)

    await db.commit()
    await db.refresh(activity)
    return activity


@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def add_custom_activity(
    trip_id: str,
    payload: ActivityAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await _get_trip_or_404(trip_id, current_user.id, db)
    activity = TripActivity(
        trip_id=trip.id,
        activity_name=payload.activity_name,
        activity_type=payload.activity_type,
        description=payload.description,
        source="user_added",
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity
