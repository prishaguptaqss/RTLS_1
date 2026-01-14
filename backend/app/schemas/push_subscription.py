"""
Pydantic schemas for Push Subscription API.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PushSubscriptionKeys(BaseModel):
    """Keys for Web Push subscription."""
    p256dh: str = Field(..., description="P256DH public key")
    auth: str = Field(..., description="Auth secret")


class PushSubscriptionCreate(BaseModel):
    """Schema for creating a push subscription."""
    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: PushSubscriptionKeys = Field(..., description="Encryption keys")
    user_agent: Optional[str] = Field(None, description="Browser user agent")


class PushSubscriptionResponse(BaseModel):
    """Schema for push subscription response."""
    id: int
    staff_id: int
    organization_id: int
    endpoint: str
    created_at: datetime

    class Config:
        from_attributes = True


class PushSubscriptionDelete(BaseModel):
    """Schema for deleting a push subscription."""
    endpoint: str = Field(..., description="Push service endpoint URL to delete")
