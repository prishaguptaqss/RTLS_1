"""
Pydantic schemas for Building model.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional


class BuildingBase(BaseModel):
    """Base schema with common building fields."""
    name: str


class BuildingCreate(BuildingBase):
    """Schema for creating a new building."""
    organization_id: int


class BuildingUpdate(BaseModel):
    """Schema for updating a building (all fields optional)."""
    name: Optional[str] = None
    organization_id: Optional[int] = None


class Building(BuildingBase):
    """Schema for reading a building (includes database fields)."""
    id: int
    organization_id: int

    model_config = ConfigDict(from_attributes=True)
