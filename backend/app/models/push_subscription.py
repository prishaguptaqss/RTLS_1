"""
Push Subscription model for Web Push Notifications.
Stores browser push subscription details for staff members.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class PushSubscription(Base):
    """
    Push Subscription model for storing Web Push notification subscriptions.

    Each staff member can have multiple subscriptions (different browsers/devices).
    Subscriptions are organization-specific for security.
    """
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="Subscription ID")

    # Staff relationship
    staff_id = Column(
        Integer,
        ForeignKey('staff.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Staff member ID"
    )

    # Organization scope (for multi-tenancy)
    organization_id = Column(
        Integer,
        ForeignKey('organizations.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Organization this subscription belongs to"
    )

    # Web Push subscription details (from browser)
    endpoint = Column(Text, nullable=False, comment="Push service endpoint URL")
    p256dh_key = Column(String(255), nullable=False, comment="P256DH public key for encryption")
    auth_key = Column(String(255), nullable=False, comment="Auth secret for encryption")

    # User agent info (for debugging/management)
    user_agent = Column(String(500), nullable=True, comment="Browser user agent string")

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Subscription creation time"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Last updated time"
    )

    # Relationships
    staff = relationship("Staff", backref="push_subscriptions")
    organization = relationship("Organization")

    # Constraints
    __table_args__ = (
        # Ensure one subscription per staff per endpoint
        UniqueConstraint('staff_id', 'endpoint', name='uq_staff_endpoint'),
        # Index for querying by organization
        Index('idx_push_sub_org_staff', 'organization_id', 'staff_id'),
    )

    def __repr__(self):
        return f"<PushSubscription(staff_id={self.staff_id}, org={self.organization_id})>"
