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
from app.utils.enums import TagStatus, NotificationType
from app.services.websocket_manager import websocket_manager
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

            await asyncio.sleep(settings.MISSING_PERSON_CHECK_INTERVAL_SECONDS)

    async def _check_missing_persons(self, db: Session):
        """
        Check for missing persons and broadcast alerts.

        Args:
            db: Database session
        """
        threshold = timedelta(seconds=settings.MISSING_PERSON_THRESHOLD_SECONDS)
        current_time = datetime.now(timezone.utc)

        # Query active tags
        active_tags = db.query(Tag).filter(Tag.status == TagStatus.active).all()

        logger.debug(f"Checking {len(active_tags)} active tags for missing persons")

        for tag in active_tags:
            if not tag.last_seen:
                continue

            time_since_seen = current_time - tag.last_seen

            if time_since_seen > threshold:
                # Check for duplicate notification within last 5 minutes to prevent spam
                five_minutes_ago = current_time - timedelta(minutes=5)
                recent_notification = db.query(Notification).filter(
                    Notification.tag_id == tag.tag_id,
                    Notification.created_at >= five_minutes_ago
                ).first()

                if recent_notification:
                    continue  # Skip creating duplicate notification

                # Get last known location
                live_loc = db.query(LiveLocation).filter(
                    LiveLocation.tag_id == tag.tag_id
                ).first()

                last_room = "Unknown"
                if live_loc and live_loc.room:
                    last_room = live_loc.room.room_name

                # Load entity details if tag is assigned to an entity
                entity_name = None
                entity_id_value = None
                entity_type = None
                entity_internal_id = None

                if tag.assigned_entity_id:
                    entity = db.query(Entity).filter(Entity.id == tag.assigned_entity_id).first()
                    if entity:
                        entity_name = entity.name
                        entity_id_value = entity.entity_id
                        entity_type = entity.type
                        entity_internal_id = entity.id

                # Calculate severity based on missing duration
                severity = self._calculate_severity(int(time_since_seen.total_seconds()))

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
                    missing_duration_seconds=int(time_since_seen.total_seconds()),
                    severity=severity,
                    is_read=False
                )
                db.add(notification)
                db.commit()
                db.refresh(notification)

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
                    "last_seen": int(tag.last_seen.timestamp()),
                    "missing_duration_seconds": int(time_since_seen.total_seconds()),
                    "severity": severity,
                    "organization_id": tag.organization_id
                })

                logger.warning(
                    f"Missing person alert: {tag.tag_id} "
                    f"(entity: {entity_name or 'N/A'}, "
                    f"last seen {time_since_seen.total_seconds():.0f}s ago in {last_room}, "
                    f"severity: {severity})"
                )

    def _calculate_severity(self, missing_duration_seconds: int) -> str:
        """
        Calculate severity based on missing duration.

        Args:
            missing_duration_seconds: Duration in seconds since last seen

        Returns:
            Severity level: low, medium, high, or critical
        """
        threshold = settings.MISSING_PERSON_THRESHOLD_SECONDS

        if missing_duration_seconds < threshold * 1.5:
            return "medium"
        elif missing_duration_seconds < threshold * 3:
            return "high"
        else:
            return "critical"


# Global missing person detector instance
missing_person_detector = MissingPersonDetector()
