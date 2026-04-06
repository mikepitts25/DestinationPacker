import uuid
from sqlalchemy import String, Integer, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.database import Base


class ItemSource(str, enum.Enum):
    rule_engine = "rule_engine"
    ai = "ai"
    activity = "activity"
    user_added = "user_added"


class PackingItem(Base):
    __tablename__ = "packing_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    activity_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("trip_activities.id", ondelete="SET NULL"), nullable=True
    )
    category: Mapped[str] = mapped_column(String(100))
    item_name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    packed: Mapped[bool] = mapped_column(Boolean, default=False)
    essential: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[ItemSource] = mapped_column(SAEnum(ItemSource), default=ItemSource.rule_engine)

    trip: Mapped["Trip"] = relationship("Trip", back_populates="packing_items")  # noqa: F821
    activity: Mapped["TripActivity | None"] = relationship("TripActivity", back_populates="packing_items")  # noqa: F821
