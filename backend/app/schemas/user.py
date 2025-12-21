"""
Pydantic schemas for User model.
"""
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
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
    Role must be either 'admin' or 'staff' if provided.
    """

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        """Validate that role is either 'admin' or 'staff'."""
        if v is not None and v not in ['admin', 'staff']:
            raise ValueError('Role must be either "admin" or "staff"')
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user (all fields optional).

    NOTE: user_id cannot be changed after creation.
    Role must be either 'admin' or 'staff' if provided.
    """
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[UserStatus] = None

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        """Validate that role is either 'admin' or 'staff'."""
        if v is not None and v not in ['admin', 'staff']:
            raise ValueError('Role must be either "admin" or "staff"')
        return v


class User(UserBase):
    """Schema for reading a user (includes database fields)."""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
