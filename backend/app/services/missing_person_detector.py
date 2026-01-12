"""
Missing person detector - background task that monitors tags for inactivity.
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import asyncio
import logging

from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.entity import Entity
from app.models.notification import Notification
from app.models.organization_settings import OrganizationSettings
from app.utils.enums import TagStatus, NotificationType
from app.services.websocket_manager import websocket_manager
from app.services.push_notification_service import push_notification_service
from app.config import settings

logger = logging.getLogger(__name__)


class MissingPersonDetector:
    """
    Background task: Check for missing persons every X seconds.

    Logic:
    1. Query all tags with status='active'
    2. For each tag: if (current_time - last_seen) > THRESHOLD:
        - Broadcast MISSING_PERSON WebSocket event
    """

    async def run(self, db: Session):
        """
        Main loop for missing person detection.

        Args:
            db: Database session

        Runs indefinitely until cancelled.
        """
        logger.info(
            f"Missing person detector started (threshold: {settings.MISSING_PERSON_THRESHOLD_SECONDS}s, "
            f"interval: {settings.MISSING_PERSON_CHECK_INTERVAL_SECONDS}s)"
        )

        while True:
            try:
                await self._check_missing_persons(db)
            except Exception as e:
                logger.error(f"Error in missing person detection: {e}", exc_info=True)
                # Rollback the failed transaction to allow subsequent queries
                db.rollback()

            await asyncio.sleep(settings.MISSING_PERSON_CHECK_INTERVAL_SECONDS)

    async def _check_missing_persons(self, db: Session):
        """
        Check for untracked entities (offline tags assigned to entities) and broadcast alerts.
        An entity is considered "untracked" when its assigned tag has status='offline'.

        Args:
            db: Database session
        """
        current_time = datetime.now(timezone.utc)

        # Query all offline tags that are assigned to entities
        offline_tags = db.query(Tag).filter(
            Tag.status == TagStatus.offline,
            Tag.assigned_entity_id.isnot(None)  # Only tags assigned to entities
        ).all()

        logger.debug(f"Checking {len(offline_tags)} offline entity tags for untracked notifications")

        for tag in offline_tags:
            # Check if notification already exists for this tag
            existing_notification = db.query(Notification).filter(
                Notification.tag_id == tag.tag_id,
                Notification.is_read == False
            ).first()

            if existing_notification:
                # Notification already exists, skip
                logger.debug(f"Notification already exists for tag {tag.tag_id}")
                continue

            # Get last known location
            live_loc = db.query(LiveLocation).filter(
                LiveLocation.tag_id == tag.tag_id
            ).first()

            last_room = "Unknown"
            if live_loc and live_loc.room:
                last_room = live_loc.room.room_name

            # Load entity details (we know tag is assigned to entity from query filter)
            entity = db.query(Entity).filter(Entity.id == tag.assigned_entity_id).first()
            if not entity:
                logger.warning(f"Tag {tag.tag_id} assigned to non-existent entity {tag.assigned_entity_id}")
                continue

            entity_name = entity.name
            entity_id_value = entity.entity_id
            entity_type = entity.type
            entity_internal_id = entity.id

            # Calculate missing duration
            if tag.last_seen:
                time_since_seen = current_time - tag.last_seen
                missing_duration_seconds = int(time_since_seen.total_seconds())
            else:
                missing_duration_seconds = 0

            # Set severity based on offline status (medium by default for untracked)
            severity = "high"

            # Persist notification to database
            notification = Notification(
                organization_id=tag.organization_id,
                type=NotificationType.MISSING_PERSON,
                tag_id=tag.tag_id,
                entity_id=entity_internal_id,
                entity_name=entity_name,
                entity_type=entity_type,
                user_id=tag.assigned_user_id,
                user_name=tag.assigned_user.name if tag.assigned_user else None,
                last_room=last_room,
                last_seen=tag.last_seen,
                missing_duration_seconds=missing_duration_seconds,
                severity=severity,
                is_read=False
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)

            # Send browser push notification to staff with NOTIFICATION_VIEW permission
            try:
                await push_notification_service.send_notification_to_staff(
                    db=db,
                    notification=notification
                )
            except Exception as push_error:
                logger.error(f"Failed to send push notification: {push_error}", exc_info=True)
                # Don't fail the entire notification process if push fails

            # Broadcast enhanced WebSocket message
            await websocket_manager.broadcast({
                "type": "MISSING_PERSON",
                "notification_id": notification.id,
                "tag_id": tag.tag_id,
                "entity_name": entity_name,
                "entity_id": entity_id_value,
                "entity_type": entity_type.value if entity_type else None,
                "user_name": tag.assigned_user.name if tag.assigned_user else None,
                "last_room": last_room,
                "last_seen": int(tag.last_seen.timestamp()) if tag.last_seen else None,
                "missing_duration_seconds": missing_duration_seconds,
                "severity": severity,
                "organization_id": tag.organization_id
            })

            logger.warning(
                f"Untracked entity alert: {entity_name or entity_id_value} "
                f"(tag: {tag.tag_id}, last location: {last_room}, "
                f"severity: {severity})"
            )

    def _calculate_severity(self, missing_duration_seconds: int, threshold_seconds: int) -> str:
        """
        Calculate severity based on missing duration.

        Args:
            missing_duration_seconds: Duration in seconds since last seen
            threshold_seconds: Organization-specific threshold in seconds

        Returns:
            Severity level: low, medium, high, or critical
        """
        if missing_duration_seconds < threshold_seconds * 1.5:
            return "medium"
        elif missing_duration_seconds < threshold_seconds * 3:
            return "high"
        else:
            return "critical"


# Global missing person detector instance
missing_person_detector = MissingPersonDetector()
