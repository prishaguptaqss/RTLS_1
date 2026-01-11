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
    anchor_name: Optional[str] = None
    room_id: Optional[int] = None
    status: Optional[AnchorStatus] = AnchorStatus.inactive_in_store
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None


class AnchorCreate(AnchorBase):
    """Schema for creating a new anchor."""
    pass


class AnchorUpdate(BaseModel):
    """Schema for updating an anchor (all fields optional except anchor_id)."""
    anchor_name: Optional[str] = None
    room_id: Optional[int] = None
    status: Optional[AnchorStatus] = None
    last_seen: Optional[datetime] = None
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None


class Anchor(AnchorBase):
    """Schema for reading an anchor (includes database fields)."""
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AnchorLookupResponse(BaseModel):
    """Schema for anchor organization lookup response (used by test.py)."""
    anchor_id: str
    organization_id: int
    room_id: Optional[int] = None
    room_name: Optional[str] = None
    status: AnchorStatus

    model_config = ConfigDict(from_attributes=True)
