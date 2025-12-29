"""Email configuration helper for organization-specific settings."""
from sqlalchemy.orm import Session
from typing import Optional, Dict
from app.config import settings
from app.models.organization_settings import OrganizationSettings


def get_email_config(db: Session, staff_organization_id: Optional[int] = None) -> Dict[str, any]:
    """
    Get email configuration from organization settings or fallback to global config.

    Args:
        db: Database session
        staff_organization_id: Organization ID to get settings for

    Returns:
        Dictionary with email configuration
    """
    # Try to get organization-specific settings
    if staff_organization_id:
        org_settings = db.query(OrganizationSettings).filter(
            OrganizationSettings.organization_id == staff_organization_id
        ).first()

        if org_settings and org_settings.smtp_username and org_settings.smtp_password:
            return {
                "smtp_host": org_settings.smtp_host or settings.SMTP_HOST,
                "smtp_port": org_settings.smtp_port or settings.SMTP_PORT,
                "smtp_username": org_settings.smtp_username,
                "smtp_password": org_settings.smtp_password,
                "smtp_from_email": org_settings.smtp_from_email or org_settings.smtp_username,
                "smtp_from_name": org_settings.smtp_from_name or settings.SMTP_FROM_NAME,
            }

    # Fallback to global settings
    return {
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_password": settings.SMTP_PASSWORD,
        "smtp_from_email": settings.SMTP_FROM_EMAIL,
        "smtp_from_name": settings.SMTP_FROM_NAME,
    }
