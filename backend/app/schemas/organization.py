"""
Pydantic schemas for Organization model.
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class OrganizationBase(BaseModel):
    """Base organization schema with common fields."""
    org_id: str
    name: str


class OrganizationCreate(OrganizationBase):
    """Schema for creating a new organization."""
    pass


class OrganizationUpdate(BaseModel):
    """Schema for updating an existing organization."""
    name: Optional[str] = None
    # org_id cannot be changed after creation


class Organization(OrganizationBase):
    """Complete organization schema returned by API."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
