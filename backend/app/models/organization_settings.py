"""
OrganizationSettings model for RTLS system.
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class OrganizationSettings(Base):
    """Organization-specific settings model."""
    __tablename__ = "organization_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    untracked_threshold_seconds = Column(Integer, nullable=False, default=30, comment="Seconds before tag is marked as lost/untracked")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="settings")
