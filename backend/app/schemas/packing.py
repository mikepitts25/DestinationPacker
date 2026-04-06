import uuid
from pydantic import BaseModel
from app.models.packing_item import ItemSource


class PackingItemCreate(BaseModel):
    category: str
    item_name: str
    quantity: int = 1
    essential: bool = False


class PackingItemUpdate(BaseModel):
    packed: bool | None = None
    quantity: int | None = None
    category: str | None = None
    item_name: str | None = None


class PackingItemResponse(BaseModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    activity_id: uuid.UUID | None
    category: str
    item_name: str
    quantity: int
    packed: bool
    essential: bool
    source: ItemSource

    model_config = {"from_attributes": True}


class PackingListResponse(BaseModel):
    trip_id: uuid.UUID
    items: list[PackingItemResponse]
    categories: list[str]
    total_items: int
    packed_items: int

    model_config = {"from_attributes": True}
