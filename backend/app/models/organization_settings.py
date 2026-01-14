"""
OrganizationSettings model for RTLS system.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class OrganizationSettings(Base):
    """Organization-specific settings model."""
    __tablename__ = "organization_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    untracked_threshold_seconds = Column(Integer, nullable=False, default=30, comment="Seconds before tag is marked as lost/untracked")

    # Email Configuration
    smtp_host = Column(String, nullable=True, default="smtp.gmail.com", comment="SMTP server host")
    smtp_port = Column(Integer, nullable=True, default=587, comment="SMTP server port")
    smtp_username = Column(String, nullable=True, comment="SMTP username (email address)")
    smtp_password = Column(String, nullable=True, comment="SMTP password or app password")
    smtp_from_email = Column(String, nullable=True, comment="Email address to send from")
    smtp_from_name = Column(String, nullable=True, default="RTLS System", comment="Display name for sent emails")

    # Mail Signature Configuration
    mail_signature_text = Column(String, nullable=True, comment="Custom email signature text")
    mail_signature_logo = Column(String, nullable=True, comment="Path to mail signature logo file")
    organization_website = Column(String, nullable=True, comment="Organization website URL")
    organization_phone = Column(String, nullable=True, comment="Organization phone number")
    organization_address_line = Column(String, nullable=True, comment="Organization address for email footer")
    social_links = Column(String, nullable=True, comment="JSON string of social media links")

    # Notification Settings
    browser_notifications_enabled = Column(Boolean, nullable=False, default=True, comment="Enable/disable browser push notifications")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="settings")
