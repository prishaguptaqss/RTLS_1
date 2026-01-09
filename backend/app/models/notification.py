"""
Notification model for RTLS system.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.enums import NotificationType


class Notification(Base):
    """Notification model for tracking system alerts."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="Notification ID")

    # Organization scope (critical for multi-tenancy)
    organization_id = Column(
        Integer,
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Organization this notification belongs to"
    )

    # Notification type
    type = Column(
        SQLEnum(NotificationType),
        nullable=False,
        default=NotificationType.MISSING_PERSON,
        index=True,
        comment="Notification type"
    )

    # Patient/Tag information
    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Associated tag ID"
    )
    patient_id = Column(
        String,
        ForeignKey("patients.patient_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Associated patient ID"
    )
    patient_name = Column(String, nullable=True, comment="Patient name (denormalized for historical display)")

    # User information (if tag was assigned to user instead of patient)
    user_id = Column(
        String,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        comment="Associated user ID"
    )
    user_name = Column(String, nullable=True, comment="User name (denormalized)")

    # Location information
    last_room = Column(String, nullable=True, comment="Last known room")
    last_seen = Column(DateTime(timezone=True), nullable=True, comment="Last seen timestamp")
    missing_duration_seconds = Column(Integer, nullable=True, comment="Duration missing in seconds")

    # Notification metadata
    is_read = Column(Boolean, default=False, nullable=False, index=True, comment="Read status")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="Notification creation time"
    )
    read_at = Column(DateTime(timezone=True), nullable=True, comment="Time when notification was read")

    # Severity (calculated based on missing duration)
    severity = Column(String, default="medium", nullable=False, comment="Severity: low, medium, high, critical")

    # Relationships
    organization = relationship("Organization", back_populates="notifications")
    tag = relationship("Tag")
    patient = relationship("Patient")
    user = relationship("User")
