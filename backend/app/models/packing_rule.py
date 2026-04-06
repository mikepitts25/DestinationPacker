import uuid
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class PackingRule(Base):
    """
    Seed data table for the rule engine.
    Rules are evaluated against trip context to produce packing items.
    """
    __tablename__ = "packing_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    # What triggers this rule
    trigger_type: Mapped[str] = mapped_column(String(50))
    # Values: 'weather', 'activity', 'accommodation', 'travel_method', 'destination_type', 'duration', 'always'
    trigger_value: Mapped[str] = mapped_column(String(100))
    # e.g. 'rain', 'hiking', 'camping', 'flight', 'beach', '7+', 'international', 'always'

    # What item this rule produces
    category: Mapped[str] = mapped_column(String(100))
    item_name: Mapped[str] = mapped_column(String(255))

    # Quantity formula: '1', 'days', 'days+1', 'days/2', 'travelers'
    quantity_formula: Mapped[str] = mapped_column(String(50), default="1")

    essential: Mapped[bool] = mapped_column(Boolean, default=False)
