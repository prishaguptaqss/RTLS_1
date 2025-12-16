"""
Pydantic schemas for Anchor model.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.utils.enums import AnchorStatus


class AnchorBase(BaseModel):
    """Base schema with common anchor fields."""
    anchor_id: str
    room_id: Optional[int] = None
    status: Optional[AnchorStatus] = AnchorStatus.active


class AnchorCreate(AnchorBase):
    """Schema for creating a new anchor."""
    pass


class AnchorUpdate(BaseModel):
    """Schema for updating an anchor (all fields optional except anchor_id)."""
    room_id: Optional[int] = None
    status: Optional[AnchorStatus] = None
    last_seen: Optional[datetime] = None


class Anchor(AnchorBase):
    """Schema for reading an anchor (includes database fields)."""
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
