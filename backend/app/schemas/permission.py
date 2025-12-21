"""
Pydantic schemas for Permission model.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class PermissionBase(BaseModel):
    """Base schema for Permission."""
    code: str = Field(..., description="Unique permission code")
    name: str = Field(..., description="Human-readable permission name")
    module: str = Field(..., description="Module this permission belongs to")
    description: Optional[str] = Field(None, description="Permission description")


class PermissionResponse(PermissionBase):
    """Schema for permission response."""
    id: int

    class Config:
        from_attributes = True


class PermissionListResponse(BaseModel):
    """Schema for listing permissions."""
    total: int
    permissions: List[PermissionResponse]


class PermissionsByModule(BaseModel):
    """Schema for permissions grouped by module."""
    module: str
    permissions: List[PermissionResponse]
