"""
Organization-specific settings/configuration endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from sqlalchemy.orm import Session
import requests
import logging
import json
import os
import uuid
from pathlib import Path

from app.schemas.settings import Settings, SettingsUpdate, SocialLink
from app.api.deps import get_db
from app.models.organization import Organization
from app.models.organization_settings import OrganizationSettings

router = APIRouter()
logger = logging.getLogger(__name__)

# Python service configuration endpoint
PYTHON_SERVICE_CONFIG_URL = "http://localhost:5001/config/threshold"

# Configuration for signature logo uploads
SIGNATURE_UPLOAD_DIR = Path("uploads/signatures")
SIGNATURE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif"}


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
            untracked_threshold_seconds=30,
            history_retention_days=1
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    # Mask password in response
    masked_password = "********" if settings.smtp_password else None

    # Parse social links from JSON string
    social_links = None
    if settings.social_links:
        try:
            social_links_data = json.loads(settings.social_links)
            social_links = [SocialLink(**link) for link in social_links_data]
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Failed to parse social_links JSON: {e}")
            social_links = None

    # Validate logo file exists before returning path
    validated_logo_path = None
    if settings.mail_signature_logo:
        logo_full_path = Path(settings.mail_signature_logo)
        if logo_full_path.exists():
            validated_logo_path = settings.mail_signature_logo
        else:
            logger.warning(f"Logo file not found: {settings.mail_signature_logo}, clearing from response")
            # Optionally clear from DB as well
            settings.mail_signature_logo = None
            db.commit()

    return Settings(
        untracked_threshold_seconds=settings.untracked_threshold_seconds,
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_username=settings.smtp_username,
        smtp_password=masked_password,
        smtp_from_email=settings.smtp_from_email,
        smtp_from_name=settings.smtp_from_name,
        mail_signature_text=settings.mail_signature_text,
        mail_signature_logo=validated_logo_path,
        organization_website=settings.organization_website,
        organization_phone=settings.organization_phone,
        organization_address_line=settings.organization_address_line,
        social_links=social_links,
        browser_notifications_enabled=settings.browser_notifications_enabled,
        history_retention_days=settings.history_retention_days
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

    # Track if threshold changed for Python service notification
    threshold_changed = False
    new_threshold = None
    old_threshold = settings.untracked_threshold_seconds

    # Update threshold if provided
    if settings_update.untracked_threshold_seconds is not None:
        new_threshold = settings_update.untracked_threshold_seconds
        logger.info(f"Received threshold update request: {new_threshold} seconds (type: {type(new_threshold).__name__})")
        logger.info(f"Old threshold was: {old_threshold} seconds")
        settings.untracked_threshold_seconds = new_threshold
        threshold_changed = True

    # Update email settings if provided (allow empty strings to clear values)
    if settings_update.smtp_host is not None:
        settings.smtp_host = settings_update.smtp_host if settings_update.smtp_host else None
    if settings_update.smtp_port is not None:
        settings.smtp_port = settings_update.smtp_port
    if settings_update.smtp_username is not None:
        settings.smtp_username = settings_update.smtp_username if settings_update.smtp_username else None
    if settings_update.smtp_password is not None and settings_update.smtp_password != "********":
        # Only update password if it's not the masked value
        settings.smtp_password = settings_update.smtp_password if settings_update.smtp_password else None
    if settings_update.smtp_from_email is not None:
        settings.smtp_from_email = settings_update.smtp_from_email if settings_update.smtp_from_email else None
    if settings_update.smtp_from_name is not None:
        settings.smtp_from_name = settings_update.smtp_from_name if settings_update.smtp_from_name else None

    # Update mail signature settings if provided (allow empty strings to clear values)
    if settings_update.mail_signature_text is not None:
        settings.mail_signature_text = settings_update.mail_signature_text if settings_update.mail_signature_text else None
    if settings_update.mail_signature_logo is not None:
        settings.mail_signature_logo = settings_update.mail_signature_logo if settings_update.mail_signature_logo else None
    if settings_update.organization_website is not None:
        settings.organization_website = settings_update.organization_website if settings_update.organization_website else None
    if settings_update.organization_phone is not None:
        settings.organization_phone = settings_update.organization_phone if settings_update.organization_phone else None
    if settings_update.organization_address_line is not None:
        settings.organization_address_line = settings_update.organization_address_line if settings_update.organization_address_line else None
    if settings_update.social_links is not None:
        # Convert list of SocialLink objects to JSON string
        if settings_update.social_links:
            social_links_data = [link.dict() for link in settings_update.social_links]
            settings.social_links = json.dumps(social_links_data)
        else:
            settings.social_links = None

    # Update notification settings if provided
    if settings_update.browser_notifications_enabled is not None:
        settings.browser_notifications_enabled = settings_update.browser_notifications_enabled

    # Update history settings if provided
    if settings_update.history_retention_days is not None:
        settings.history_retention_days = settings_update.history_retention_days

    # Commit all changes to database
    db.commit()
    db.refresh(settings)

    logger.info(f"Settings updated for organization {organization_id}")
    logger.info(f"Current untracked threshold: {settings.untracked_threshold_seconds} seconds")

    # Notify Python scanner service AFTER successful database commit
    if threshold_changed and new_threshold is not None:
        logger.info(f"Threshold changed from {old_threshold} to {new_threshold} seconds for organization {organization_id}")
        try:
            response = requests.put(
                f"{PYTHON_SERVICE_CONFIG_URL}/{organization_id}",
                json={'threshold_seconds': new_threshold},
                timeout=3
            )
            if response.status_code != 200:
                logger.warning(f"Failed to update Python service threshold: {response.text}")
            else:
                logger.info(f"Successfully notified Python scanner service about new threshold: {new_threshold} seconds")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Could not connect to Python service: {e}")

    # Mask password in response
    masked_password = "********" if settings.smtp_password else None

    # Parse social links from JSON string
    social_links = None
    if settings.social_links:
        try:
            social_links_data = json.loads(settings.social_links)
            social_links = [SocialLink(**link) for link in social_links_data]
        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Failed to parse social_links JSON: {e}")
            social_links = None

    return Settings(
        untracked_threshold_seconds=settings.untracked_threshold_seconds,
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_username=settings.smtp_username,
        smtp_password=masked_password,
        smtp_from_email=settings.smtp_from_email,
        smtp_from_name=settings.smtp_from_name,
        mail_signature_text=settings.mail_signature_text,
        mail_signature_logo=settings.mail_signature_logo,
        organization_website=settings.organization_website,
        organization_phone=settings.organization_phone,
        organization_address_line=settings.organization_address_line,
        social_links=social_links,
        browser_notifications_enabled=settings.browser_notifications_enabled,
        history_retention_days=settings.history_retention_days
    )


@router.post("/upload-signature-logo")
async def upload_signature_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    organization_id: int = Depends(get_organization_id_from_header)
):
    """Upload signature logo image for the organization."""
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

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024):.1f} MB"
        )

    # Delete old signature logo if exists
    if settings.mail_signature_logo and os.path.exists(settings.mail_signature_logo):
        try:
            os.remove(settings.mail_signature_logo)
        except Exception as e:
            logger.warning(f"Failed to delete old signature logo: {e}")

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = SIGNATURE_UPLOAD_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update settings with file path
    settings.mail_signature_logo = str(file_path)
    db.commit()
    db.refresh(settings)

    return {
        "success": True,
        "file_path": str(file_path),
        "message": "Signature logo uploaded successfully"
    }
