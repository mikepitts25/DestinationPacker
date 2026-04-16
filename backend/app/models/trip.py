import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Integer, ForeignKey, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.database import Base


class AccommodationType(str, enum.Enum):
    hotel = "hotel"
    hostel = "hostel"
    airbnb = "airbnb"
    camping = "camping"
    resort = "resort"
    cruise = "cruise"
    friends_family = "friends_family"


class TravelMethod(str, enum.Enum):
    flight = "flight"
    road_trip = "road_trip"
    train = "train"
    cruise = "cruise"
    backpacking = "backpacking"


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    destination: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    country_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    accommodation: Mapped[AccommodationType] = mapped_column(SAEnum(AccommodationType))
    travel_method: Mapped[TravelMethod] = mapped_column(SAEnum(TravelMethod))
    travelers: Mapped[int] = mapped_column(Integer, default=1)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="trips")  # noqa: F821
    packing_items: Mapped[list["PackingItem"]] = relationship(  # noqa: F821
        "PackingItem", back_populates="trip", cascade="all, delete-orphan"
    )
    activities: Mapped[list["TripActivity"]] = relationship(  # noqa: F821
        "TripActivity", back_populates="trip", cascade="all, delete-orphan"
    )
    shares: Mapped[list["TripShare"]] = relationship(  # noqa: F821
        "TripShare", back_populates="trip", cascade="all, delete-orphan"
    )

    @property
    def duration_days(self) -> int:
        return (self.end_date - self.start_date).days + 1
