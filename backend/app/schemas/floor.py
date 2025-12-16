"""
Pydantic schemas for Floor model.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional


class FloorBase(BaseModel):
    """Base schema with common floor fields."""
    building_id: int
    floor_number: int


class FloorCreate(FloorBase):
    """Schema for creating a new floor."""
    pass


class FloorUpdate(BaseModel):
    """Schema for updating a floor (all fields optional)."""
    building_id: Optional[int] = None
    floor_number: Optional[int] = None


class Floor(FloorBase):
    """Schema for reading a floor (includes database fields)."""
    id: int

    model_config = ConfigDict(from_attributes=True)
