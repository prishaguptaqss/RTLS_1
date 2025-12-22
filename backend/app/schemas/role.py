"""
Pydantic schemas for Role model.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PermissionInfo(BaseModel):
    """Schema for permission information."""
    id: int
    code: str
    name: str
    module: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    """Base schema for Role."""
    name: str = Field(..., min_length=1, description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    organization_id: Optional[int] = Field(None, description="Organization ID (null for global roles)")


class RoleCreate(RoleBase):
    """Schema for creating a new role."""
    permission_ids: List[int] = Field(default_factory=list, description="List of permission IDs")


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(RoleBase):
    """Schema for role response."""
    id: int
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionInfo] = []

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    """Schema for listing roles."""
    total: int
    roles: List[RoleResponse]


class RoleWithStaffCount(RoleResponse):
    """Schema for role with staff count."""
    staff_count: int
