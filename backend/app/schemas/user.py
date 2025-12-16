"""
Pydantic schemas for User model.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from app.utils.enums import UserStatus


class UserBase(BaseModel):
    """Base schema with common user fields."""
    name: str
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[UserStatus] = UserStatus.active


class UserCreate(UserBase):
    """Schema for creating a new user."""
    pass


class UserUpdate(BaseModel):
    """Schema for updating a user (all fields optional)."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[UserStatus] = None


class User(UserBase):
    """Schema for reading a user (includes database fields)."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
