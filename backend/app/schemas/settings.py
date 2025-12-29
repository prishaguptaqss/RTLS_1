"""
Pydantic schemas for system settings/configuration.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class SettingsUpdate(BaseModel):
    """Schema for updating system settings."""
    untracked_threshold_seconds: Optional[int] = Field(
        None,
        ge=5,
        le=3600,
        description="Seconds before an entity is marked as untracked (5-3600)"
    )

    # Email Configuration
    smtp_host: Optional[str] = Field(None, description="SMTP server host (e.g., smtp.gmail.com)")
    smtp_port: Optional[int] = Field(None, ge=1, le=65535, description="SMTP server port (e.g., 587)")
    smtp_username: Optional[str] = Field(None, description="SMTP username/email")
    smtp_password: Optional[str] = Field(None, description="SMTP password or app password")
    smtp_from_email: Optional[EmailStr] = Field(None, description="Email address to send from")
    smtp_from_name: Optional[str] = Field(None, description="Display name for sent emails")


class Settings(BaseModel):
    """Complete settings schema returned by API."""
    untracked_threshold_seconds: int = Field(
        description="Seconds before an entity is marked as untracked"
    )

    # Email Configuration
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None  # Will be masked in response
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
