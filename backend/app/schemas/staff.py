"""
Pydantic schemas for Staff model.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class StaffBase(BaseModel):
    """Base schema for Staff."""
    staff_id: str = Field(..., min_length=1, description="Unique staff identifier")
    name: str = Field(..., min_length=1, description="Staff member name")
    email: EmailStr = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    organization_id: Optional[int] = Field(None, description="Organization ID")


class StaffCreate(StaffBase):
    """Schema for creating a new staff member."""
    password: Optional[str] = Field(None, min_length=6, description="Password (auto-generated if not provided)")
    role_ids: List[int] = Field(default_factory=list, description="List of role IDs to assign")
    is_admin: bool = Field(default=False, description="Whether user is an admin")


class StaffUpdate(BaseModel):
    """Schema for updating a staff member."""
    name: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class StaffChangePassword(BaseModel):
    """Schema for changing password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, description="New password")


class RoleInfo(BaseModel):
    """Schema for role information in staff response."""
    id: int
    name: str

    class Config:
        from_attributes = True


class StaffResponse(StaffBase):
    """Schema for staff response."""
    id: int
    is_admin: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    roles: List[RoleInfo] = []
    temporary_password: Optional[str] = Field(None, description="Auto-generated password (only returned on creation)")

    class Config:
        from_attributes = True


class StaffListResponse(BaseModel):
    """Schema for listing staff members."""
    total: int
    staff: List[StaffResponse]
