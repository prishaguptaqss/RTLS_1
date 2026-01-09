"""
Pydantic schemas for Notification model.
"""
from pydantic import BaseModel, ConfigDict, computed_field
from datetime import datetime
from typing import Optional, List
from app.utils.enums import NotificationType


class NotificationBase(BaseModel):
    """Base notification schema with common fields."""
    type: NotificationType
    tag_id: Optional[str] = None
    patient_name: Optional[str] = None
    user_name: Optional[str] = None
    last_room: Optional[str] = None
    last_seen: Optional[datetime] = None
    missing_duration_seconds: Optional[int] = None
    severity: str = "medium"


class NotificationCreate(NotificationBase):
    """Schema for creating a new notification (internal use)."""
    organization_id: int
    patient_id: Optional[str] = None
    user_id: Optional[str] = None


class NotificationUpdate(BaseModel):
    """Schema for updating notification status."""
    is_read: bool


class NotificationResponse(NotificationBase):
    """Complete notification schema returned by API."""
    id: int
    organization_id: int
    patient_id: Optional[str] = None
    user_id: Optional[str] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def display_name(self) -> str:
        """Get the display name for the notification (patient or user name)."""
        return self.patient_name or self.user_name or "Unknown"


class NotificationList(BaseModel):
    """Paginated list of notifications with metadata."""
    notifications: List[NotificationResponse]
    total: int
    page: int
    limit: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Response schema for unread count endpoint."""
    count: int


class MarkAllReadResponse(BaseModel):
    """Response schema for mark all read endpoint."""
    updated_count: int
