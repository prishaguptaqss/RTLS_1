"""
Organization-specific settings/configuration endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import requests
import logging

from app.schemas.settings import Settings, SettingsUpdate
from app.api.deps import get_db
from app.models.organization import Organization
from app.models.organization_settings import OrganizationSettings

router = APIRouter()
logger = logging.getLogger(__name__)

# Python service configuration endpoint
PYTHON_SERVICE_CONFIG_URL = "http://localhost:5001/config/threshold"


def get_organization_id_from_header(x_organization_id: str = Header(...)) -> int:
    """Extract organization ID from header."""
    try:
        return int(x_organization_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid organization ID")


@router.get("/", response_model=Settings)
async def get_settings(
    db: Session = Depends(get_db),
    organization_id: int = Depends(get_organization_id_from_header)
):
    """Get organization-specific settings."""
    # Get organization
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get or create settings
    settings = db.query(OrganizationSettings).filter(
        OrganizationSettings.organization_id == organization_id
    ).first()

    if not settings:
        # Create default settings
        settings = OrganizationSettings(
            organization_id=organization_id,
            untracked_threshold_seconds=30
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return Settings(
        untracked_threshold_seconds=settings.untracked_threshold_seconds
    )


@router.put("/", response_model=Settings)
async def update_settings(
    settings_update: SettingsUpdate,
    db: Session = Depends(get_db),
    organization_id: int = Depends(get_organization_id_from_header)
):
    """
    Update organization-specific settings.

    This updates the database and notifies the Python scanner service.
    """
    # Get organization
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get or create settings
    settings = db.query(OrganizationSettings).filter(
        OrganizationSettings.organization_id == organization_id
    ).first()

    if not settings:
        settings = OrganizationSettings(organization_id=organization_id)
        db.add(settings)

    # Update threshold if provided
    if settings_update.untracked_threshold_seconds is not None:
        new_threshold = settings_update.untracked_threshold_seconds
        settings.untracked_threshold_seconds = new_threshold

        db.commit()
        db.refresh(settings)

        # Notify Python scanner service to reload settings for this organization
        try:
            response = requests.put(
                f"{PYTHON_SERVICE_CONFIG_URL}/{organization_id}",
                json={'threshold_seconds': new_threshold},
                timeout=3
            )
            if response.status_code != 200:
                logger.warning(f"Failed to update Python service threshold: {response.text}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Could not connect to Python service: {e}")

    return Settings(
        untracked_threshold_seconds=settings.untracked_threshold_seconds
    )
