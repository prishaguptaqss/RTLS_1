"""
Pydantic schemas for Tag model.
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.utils.enums import TagStatus


class TagBase(BaseModel):
    """Base schema with common tag fields."""
    tag_id: str
    name: Optional[str] = None
    assigned_user_id: Optional[str] = None
    assigned_entity_id: Optional[int] = None
    status: Optional[TagStatus] = TagStatus.active


class TagCreate(TagBase):
    """Schema for creating a new tag."""
    pass


class TagUpdate(BaseModel):
    """Schema for updating a tag (all fields optional except tag_id)."""
    name: Optional[str] = None
    assigned_user_id: Optional[str] = None
    assigned_entity_id: Optional[int] = None
    status: Optional[TagStatus] = None
    last_seen: Optional[datetime] = None


class Tag(TagBase):
    """Schema for reading a tag (includes database fields)."""
    last_seen: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
