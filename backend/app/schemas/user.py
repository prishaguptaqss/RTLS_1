"""
Pydantic schemas for User model.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from app.utils.enums import UserStatus


class UserBase(BaseModel):
    """Base schema with common user fields."""
    user_id: str
    name: str
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[UserStatus] = UserStatus.active


class UserCreate(UserBase):
    """Schema for creating a new user.

    user_id must be provided by the user and be unique.
    Example formats: 'EMP-12345', 'DOC-001', 'PATIENT-789'
    """
    pass


class UserUpdate(BaseModel):
    """Schema for updating a user (all fields optional).

    NOTE: user_id cannot be changed after creation.
    """
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[UserStatus] = None


class User(UserBase):
    """Schema for reading a user (includes database fields)."""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
