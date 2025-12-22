"""
Pydantic schemas for authentication.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., description="Password")


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"


class UserPermission(BaseModel):
    """Schema for user permission."""
    code: str
    name: str
    module: str


class CurrentUserResponse(BaseModel):
    """Schema for current authenticated user."""
    id: int
    staff_id: str
    name: str
    email: str
    phone: Optional[str] = None
    is_admin: bool
    is_active: bool
    organization_id: Optional[int] = None
    created_at: datetime
    permissions: List[str] = Field(default_factory=list, description="List of permission codes")
    roles: List[str] = Field(default_factory=list, description="List of role names")

    class Config:
        from_attributes = True
