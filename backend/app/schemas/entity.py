"""
Pydantic schemas for Entity model.
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.utils.enums import EntityType


class EntityBase(BaseModel):
    """Base entity schema with common fields."""
    entity_id: str
    type: EntityType
    name: Optional[str] = None


class EntityCreate(EntityBase):
    """Schema for creating a new entity."""
    assigned_tag_id: Optional[str] = None


class EntityUpdate(BaseModel):
    """Schema for updating an existing entity."""
    name: Optional[str] = None
    type: Optional[EntityType] = None
    assigned_tag_id: Optional[str] = None
    # entity_id cannot be changed after creation


class Entity(EntityBase):
    """Complete entity schema returned by API."""
    id: int
    created_at: datetime

    # Enriched fields from tag and location queries
    assigned_tag_id: Optional[str] = None
    tag_name: Optional[str] = None
    tracking_status: Optional[str] = None  # "tracked" or "untracked"
    current_location: Optional[str] = None  # "Building > Floor X > Room"
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
