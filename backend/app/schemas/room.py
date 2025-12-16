"""
Pydantic schemas for Room model.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional


class RoomBase(BaseModel):
    """Base schema with common room fields."""
    floor_id: int
    room_name: str
    room_type: Optional[str] = None


class RoomCreate(RoomBase):
    """Schema for creating a new room."""
    pass


class RoomUpdate(BaseModel):
    """Schema for updating a room (all fields optional)."""
    floor_id: Optional[int] = None
    room_name: Optional[str] = None
    room_type: Optional[str] = None


class Room(RoomBase):
    """Schema for reading a room (includes database fields)."""
    id: int

    model_config = ConfigDict(from_attributes=True)
