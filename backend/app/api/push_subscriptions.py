"""
Push Subscription API endpoints.
Manage Web Push notification subscriptions for staff members.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_staff, require_permission
from app.models.staff import Staff
from app.models.push_subscription import PushSubscription
from app.schemas.push_subscription import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    PushSubscriptionDelete
)
from app.utils.permissions import Permission

router = APIRouter(prefix="/push-subscriptions", tags=["Push Subscriptions"])


@router.post("", response_model=PushSubscriptionResponse, dependencies=[Depends(require_permission(Permission.NOTIFICATION_VIEW))])
def create_push_subscription(
    subscription_data: PushSubscriptionCreate,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Create or update a push subscription for the current staff member.

    Requires NOTIFICATION_VIEW permission.
    """
    # Check if subscription already exists for this staff and endpoint
    existing_sub = db.query(PushSubscription).filter(
        PushSubscription.staff_id == current_staff.id,
        PushSubscription.endpoint == subscription_data.endpoint
    ).first()

    if existing_sub:
        # Update existing subscription
        existing_sub.p256dh_key = subscription_data.keys.p256dh
        existing_sub.auth_key = subscription_data.keys.auth
        existing_sub.user_agent = subscription_data.user_agent
        db.commit()
        db.refresh(existing_sub)
        return existing_sub

    # Create new subscription
    new_subscription = PushSubscription(
        staff_id=current_staff.id,
        organization_id=current_staff.organization_id,
        endpoint=subscription_data.endpoint,
        p256dh_key=subscription_data.keys.p256dh,
        auth_key=subscription_data.keys.auth,
        user_agent=subscription_data.user_agent
    )

    db.add(new_subscription)
    db.commit()
    db.refresh(new_subscription)

    return new_subscription


@router.delete("", dependencies=[Depends(require_permission(Permission.NOTIFICATION_VIEW))])
def delete_push_subscription(
    subscription_data: PushSubscriptionDelete,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Delete a push subscription for the current staff member.

    Requires NOTIFICATION_VIEW permission.
    """
    subscription = db.query(PushSubscription).filter(
        PushSubscription.staff_id == current_staff.id,
        PushSubscription.endpoint == subscription_data.endpoint
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(subscription)
    db.commit()

    return {"message": "Subscription deleted successfully"}


@router.get("", response_model=List[PushSubscriptionResponse], dependencies=[Depends(require_permission(Permission.NOTIFICATION_VIEW))])
def list_push_subscriptions(
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    List all push subscriptions for the current staff member.

    Requires NOTIFICATION_VIEW permission.
    """
    subscriptions = db.query(PushSubscription).filter(
        PushSubscription.staff_id == current_staff.id
    ).all()

    return subscriptions


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """
    Get the VAPID public key for Web Push.

    This endpoint is public (no authentication required) as the public key
    is needed before the user can subscribe to notifications.
    """
    from app.config import settings

    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=500,
            detail="VAPID keys not configured on server"
        )

    return {"publicKey": settings.VAPID_PUBLIC_KEY}
