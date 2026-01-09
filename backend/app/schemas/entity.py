"""
Pydantic schemas for Entity model.
"""
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from datetime import datetime
from typing import Optional
from app.utils.enums import EntityType


class EntityBase(BaseModel):
    """Base entity schema with common fields."""
    entity_id: str
    type: EntityType = EntityType.patient  # Default to patient
    name: Optional[str] = None
    age: Optional[int] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        if v is not None and (v < 0 or v > 150):
            raise ValueError('Age must be between 0 and 150')
        return v


class EntityCreate(EntityBase):
    """Schema for creating a new entity."""
    # Type is auto-set to patient in the API
    assigned_tag_id: Optional[str] = None


class EntityUpdate(BaseModel):
    """Schema for updating an existing entity."""
    name: Optional[str] = None
    age: Optional[int] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    # type is not included - cannot change type after creation
    assigned_tag_id: Optional[str] = None
    # entity_id cannot be changed after creation

    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        if v is not None and (v < 0 or v > 150):
            raise ValueError('Age must be between 0 and 150')
        return v


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
