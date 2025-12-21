"""
Pydantic schemas for system settings/configuration.
"""
from pydantic import BaseModel, Field
from typing import Optional


class SettingsUpdate(BaseModel):
    """Schema for updating system settings."""
    untracked_threshold_seconds: Optional[int] = Field(
        None,
        ge=5,
        le=3600,
        description="Seconds before an entity is marked as untracked (5-3600)"
    )


class Settings(BaseModel):
    """Complete settings schema returned by API."""
    untracked_threshold_seconds: int = Field(
        description="Seconds before an entity is marked as untracked"
    )
