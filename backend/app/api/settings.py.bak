"""
System settings/configuration endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import requests

from app.schemas.settings import Settings, SettingsUpdate
from app.api.deps import get_db
from app.config import settings as app_settings

router = APIRouter()

# Python service configuration endpoint
PYTHON_SERVICE_CONFIG_URL = "http://localhost:5001/config/threshold"


@router.get("/", response_model=Settings)
async def get_settings():
    """Get current system settings."""
    return Settings(
        untracked_threshold_seconds=app_settings.MISSING_PERSON_THRESHOLD_SECONDS
    )


@router.put("/", response_model=Settings)
async def update_settings(settings_update: SettingsUpdate):
    """
    Update system settings.

    This updates both the backend configuration and the Python service threshold.
    """
    if settings_update.untracked_threshold_seconds is not None:
        new_threshold = settings_update.untracked_threshold_seconds

        # Update backend configuration (in-memory)
        app_settings.MISSING_PERSON_THRESHOLD_SECONDS = new_threshold

        # Update Python service threshold
        try:
            response = requests.put(
                PYTHON_SERVICE_CONFIG_URL,
                json={'threshold_seconds': new_threshold},
                timeout=3
            )
            if response.status_code != 200:
                # Log warning but don't fail - backend threshold is updated
                print(f"Warning: Failed to update Python service threshold: {response.text}")
        except requests.exceptions.RequestException as e:
            # Log warning but don't fail - Python service might not be running
            print(f"Warning: Could not connect to Python service: {e}")

    return Settings(
        untracked_threshold_seconds=app_settings.MISSING_PERSON_THRESHOLD_SECONDS
    )
