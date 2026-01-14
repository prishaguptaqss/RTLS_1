"""
Pydantic schemas for system settings/configuration.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List


class SocialLink(BaseModel):
    """Schema for social media link."""
    platform: str = Field(description="Social media platform name (e.g., Facebook, Twitter, LinkedIn)")
    url: str = Field(description="Full URL to the social media profile")


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

    # Mail Signature Configuration
    mail_signature_text: Optional[str] = Field(None, description="Custom email signature text")
    mail_signature_logo: Optional[str] = Field(None, description="Path to mail signature logo file")
    organization_website: Optional[str] = Field(None, description="Organization website URL")
    organization_phone: Optional[str] = Field(None, description="Organization phone number")
    organization_address_line: Optional[str] = Field(None, description="Organization address for email footer")
    social_links: Optional[List[SocialLink]] = Field(None, description="List of social media links")

    # Notification Settings
    browser_notifications_enabled: Optional[bool] = Field(None, description="Enable/disable browser push notifications")


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

    # Mail Signature Configuration
    mail_signature_text: Optional[str] = None
    mail_signature_logo: Optional[str] = None
    organization_website: Optional[str] = None
    organization_phone: Optional[str] = None
    organization_address_line: Optional[str] = None
    social_links: Optional[List[SocialLink]] = None

    # Notification Settings
    browser_notifications_enabled: bool = True
