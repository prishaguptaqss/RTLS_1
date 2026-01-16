"""
Pydantic schemas for Room model.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any


class RoomBase(BaseModel):
    """Base schema with common room fields."""
    floor_id: int
    room_name: str
    room_type: Optional[str] = None
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None
    polygon_coordinates: Optional[List[Dict[str, float]]] = None  # Array of {x, y} points


class RoomCreate(RoomBase):
    """Schema for creating a new room."""
    anchor_id: Optional[str] = None  # Optional single anchor to assign (deprecated, use anchor_ids)
    anchor_ids: Optional[List[str]] = None  # Optional list of anchor IDs to assign to this room


class RoomUpdate(BaseModel):
    """Schema for updating a room (all fields optional)."""
    floor_id: Optional[int] = None
    room_name: Optional[str] = None
    room_type: Optional[str] = None
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None
    polygon_coordinates: Optional[List[Dict[str, float]]] = None  # Array of {x, y} points
    anchor_id: Optional[str] = None  # Update single anchor assignment (deprecated, use anchor_ids)
    anchor_ids: Optional[List[str]] = None  # Update list of anchor IDs to assign to this room


class Room(RoomBase):
    """Schema for reading a room (includes database fields)."""
    id: int
    building_id: Optional[int] = None  # Derived from floor relationship

    model_config = ConfigDict(from_attributes=True)
