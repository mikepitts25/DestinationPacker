import uuid
from sqlalchemy import String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.database import Base


class ActivityType(str, enum.Enum):
    outdoor = "outdoor"
    water = "water"
    cultural = "cultural"
    nightlife = "nightlife"
    dining = "dining"
    sports = "sports"
    beach = "beach"
    snow = "snow"
    business = "business"
    wellness = "wellness"
    shopping = "shopping"
    souvenirs = "souvenirs"


class TripActivity(Base):
    __tablename__ = "trip_activities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    activity_name: Mapped[str] = mapped_column(String(255))
    activity_type: Mapped[ActivityType] = mapped_column(SAEnum(ActivityType))
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="suggested")
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    selected: Mapped[bool] = mapped_column(Boolean, default=False)

    trip: Mapped["Trip"] = relationship("Trip", back_populates="activities")  # noqa: F821
    packing_items: Mapped[list["PackingItem"]] = relationship(  # noqa: F821
        "PackingItem", back_populates="activity"
    )


class TripShare(Base):
    __tablename__ = "trip_shares"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    shared_with: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    permission: Mapped[str] = mapped_column(String(20), default="view")
    accepted: Mapped[bool] = mapped_column(Boolean, default=False)

    trip: Mapped["Trip"] = relationship("Trip", back_populates="shares")  # noqa: F821
    shared_user: Mapped["User"] = relationship("User", foreign_keys=[shared_with], back_populates="shared_trips")  # noqa: F821
