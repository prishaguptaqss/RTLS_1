"""Pydantic schemas for password reset functionality."""
from pydantic import BaseModel, EmailStr, field_validator
import re


class ForgotPasswordRequest(BaseModel):
    """Request schema for initiating forgot password flow."""
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    """Request schema for verifying OTP."""
    email: EmailStr
    otp: str

    @field_validator('otp')
    @classmethod
    def validate_otp(cls, v: str) -> str:
        """Validate OTP is exactly 4 digits."""
        if not v.isdigit() or len(v) != 4:
            raise ValueError('OTP must be exactly 4 digits')
        return v


class ResetPasswordRequest(BaseModel):
    """Request schema for resetting password with OTP."""
    email: EmailStr
    otp: str
    new_password: str

    @field_validator('otp')
    @classmethod
    def validate_otp(cls, v: str) -> str:
        """Validate OTP is exactly 4 digits."""
        if not v.isdigit() or len(v) != 4:
            raise ValueError('OTP must be exactly 4 digits')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validate password meets security requirements:
        - At least 8 characters
        - Contains uppercase letter
        - Contains lowercase letter
        - Contains digit
        - Contains special character
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class ResendOTPRequest(BaseModel):
    """Request schema for resending OTP."""
    email: EmailStr


class PasswordResetResponse(BaseModel):
    """Response schema for password reset operations."""
    message: str
    success: bool
