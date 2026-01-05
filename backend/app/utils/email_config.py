"""Email configuration helper for organization-specific settings."""
from sqlalchemy.orm import Session
from typing import Optional, Dict
import json
from app.config import settings
from app.models.organization_settings import OrganizationSettings
from app.models.organization import Organization


def get_email_config(db: Session, staff_organization_id: Optional[int] = None) -> Dict[str, any]:
    """
    Get email configuration from organization settings or fallback to global config.

    Args:
        db: Database session
        staff_organization_id: Organization ID to get settings for

    Returns:
        Dictionary with email configuration including organization name and mail signature
    """
    # Try to get organization-specific settings
    if staff_organization_id:
        org_settings = db.query(OrganizationSettings).filter(
            OrganizationSettings.organization_id == staff_organization_id
        ).first()

        org = db.query(Organization).filter(
            Organization.id == staff_organization_id
        ).first()

        if org_settings and org_settings.smtp_username and org_settings.smtp_password:
            # Parse social links from JSON
            social_links = []
            if org_settings.social_links:
                try:
                    social_links = json.loads(org_settings.social_links)
                except json.JSONDecodeError:
                    social_links = []

            return {
                "smtp_host": org_settings.smtp_host or settings.SMTP_HOST,
                "smtp_port": org_settings.smtp_port or settings.SMTP_PORT,
                "smtp_username": org_settings.smtp_username,
                "smtp_password": org_settings.smtp_password,
                "smtp_from_email": org_settings.smtp_from_email or org_settings.smtp_username,
                "smtp_from_name": org_settings.smtp_from_name or settings.SMTP_FROM_NAME,
                "organization_name": org.name if org else "RTLS System",
                "organization_logo": org.logo if org else None,
                "mail_signature_text": org_settings.mail_signature_text,
                "mail_signature_logo": org_settings.mail_signature_logo,
                "organization_website": org_settings.organization_website,
                "organization_phone": org_settings.organization_phone,
                "organization_address_line": org_settings.organization_address_line,
                "social_links": social_links,
            }

    # Fallback to global settings
    return {
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_password": settings.SMTP_PASSWORD,
        "smtp_from_email": settings.SMTP_FROM_EMAIL,
        "smtp_from_name": settings.SMTP_FROM_NAME,
        "organization_name": "RTLS System",
        "organization_logo": None,
        "mail_signature_text": None,
        "mail_signature_logo": None,
        "organization_website": None,
        "organization_phone": None,
        "organization_address_line": None,
        "social_links": [],
    }
