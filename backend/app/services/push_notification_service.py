"""
Push Notification Service for Web Push.

Sends browser push notifications to subscribed staff members.
"""
import json
import logging
from typing import Optional, List
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.models.push_subscription import PushSubscription
from app.models.staff import Staff
from app.models.notification import Notification
from app.config import settings

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Service for sending Web Push notifications to staff members."""

    def __init__(self):
        """Initialize the push notification service."""
        self.vapid_private_key = settings.VAPID_PRIVATE_KEY
        self.vapid_public_key = settings.VAPID_PUBLIC_KEY
        self.vapid_subject = settings.VAPID_SUBJECT

    def _validate_vapid_config(self) -> bool:
        """
        Validate VAPID configuration.

        Returns:
            True if VAPID keys are configured, False otherwise
        """
        if not self.vapid_private_key or not self.vapid_public_key:
            logger.warning("VAPID keys not configured. Push notifications disabled.")
            return False
        return True

    async def send_notification_to_staff(
        self,
        db: Session,
        notification: Notification,
        staff_members: Optional[List[Staff]] = None
    ):
        """
        Send push notification to specific staff members or all staff in organization.

        Args:
            db: Database session
            notification: Notification object to send
            staff_members: Optional list of specific staff to notify.
                          If None, notifies all staff with NOTIFICATION_VIEW permission
                          in the notification's organization.
        """
        if not self._validate_vapid_config():
            return

        # Get staff members to notify
        if staff_members is None:
            staff_members = self._get_staff_with_notification_permission(
                db, notification.organization_id
            )

        if not staff_members:
            logger.debug(f"No staff members to notify for organization {notification.organization_id}")
            return

        # Prepare notification payload
        payload = self._create_notification_payload(notification)

        # Send to all subscriptions for each staff member
        for staff in staff_members:
            await self._send_to_staff_subscriptions(db, staff, payload)

    def _get_staff_with_notification_permission(
        self,
        db: Session,
        organization_id: int
    ) -> List[Staff]:
        """
        Get all staff members in an organization with NOTIFICATION_VIEW permission.

        Args:
            db: Database session
            organization_id: Organization ID

        Returns:
            List of Staff objects
        """
        from app.models.permission import Permission as PermissionModel
        from app.models.role import Role
        from app.utils.permissions import Permission

        # Get staff members who have NOTIFICATION_VIEW permission
        staff_query = db.query(Staff).filter(
            Staff.organization_id == organization_id,
            Staff.is_active == True
        )

        # Filter staff with NOTIFICATION_VIEW permission
        staff_with_permission = []
        for staff in staff_query.all():
            # Admins have all permissions
            if staff.is_admin:
                staff_with_permission.append(staff)
                continue

            # Check if staff has NOTIFICATION_VIEW through their roles
            for role in staff.roles:
                permission_codes = [p.code for p in role.permissions]
                if Permission.NOTIFICATION_VIEW in permission_codes:
                    staff_with_permission.append(staff)
                    break

        return staff_with_permission

    async def _send_to_staff_subscriptions(
        self,
        db: Session,
        staff: Staff,
        payload: str
    ):
        """
        Send push notification to all subscriptions for a staff member.

        Args:
            db: Database session
            staff: Staff object
            payload: JSON payload to send
        """
        subscriptions = db.query(PushSubscription).filter(
            PushSubscription.staff_id == staff.id
        ).all()

        for subscription in subscriptions:
            try:
                await self._send_push_notification(db, subscription, payload)
            except Exception as e:
                logger.error(
                    f"Failed to send push to staff {staff.staff_id}, "
                    f"subscription {subscription.id}: {e}"
                )

    async def _send_push_notification(
        self,
        db: Session,
        subscription: PushSubscription,
        payload: str
    ):
        """
        Send a push notification to a single subscription.

        Args:
            db: Database session
            subscription: PushSubscription object
            payload: JSON payload to send

        Raises:
            WebPushException: If push fails
        """
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh_key,
                "auth": subscription.auth_key
            }
        }

        vapid_claims = {
            "sub": self.vapid_subject
        }

        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=self.vapid_private_key,
                vapid_claims=vapid_claims
            )
            logger.info(f"Push notification sent to subscription {subscription.id}")

        except WebPushException as e:
            logger.error(f"Push failed for subscription {subscription.id}: {e}")

            # If subscription is invalid (410 Gone or 404), delete it
            if e.response and e.response.status_code in [410, 404]:
                logger.info(f"Removing invalid subscription {subscription.id}")
                db.delete(subscription)
                db.commit()
            raise

    def _create_notification_payload(self, notification: Notification) -> str:
        """
        Create notification payload for Web Push.

        Args:
            notification: Notification object

        Returns:
            JSON string payload
        """
        display_name = notification.entity_name or notification.user_name or "Unknown"
        entity_id = notification.entity_id

        payload = {
            "title": "Missing Person Alert",
            "body": f"{display_name} has not been tracked",
            "icon": "/logo.png",  # Update with your app icon path
            "badge": "/badge.png",  # Update with your app badge path
            "data": {
                "notification_id": notification.id,
                "type": notification.type.value,
                "entity_name": display_name,
                "entity_id": entity_id,
                "tag_id": notification.tag_id,
                "last_room": notification.last_room,
                "severity": notification.severity,
                "organization_id": notification.organization_id,
                "url": "/notifications"  # URL to open when notification is clicked
            },
            "requireInteraction": True,  # Keep notification visible until user interacts
            "tag": f"notification-{notification.id}"  # Replace previous notification with same tag
        }

        return json.dumps(payload)


# Global push notification service instance
push_notification_service = PushNotificationService()
