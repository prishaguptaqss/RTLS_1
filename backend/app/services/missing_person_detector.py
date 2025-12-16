"""
Missing person detector - background task that monitors tags for inactivity.
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import asyncio
import logging

from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.utils.enums import TagStatus
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
        current_time = datetime.utcnow()

        # Query active tags
        active_tags = db.query(Tag).filter(Tag.status == TagStatus.active).all()

        logger.debug(f"Checking {len(active_tags)} active tags for missing persons")

        for tag in active_tags:
            if not tag.last_seen:
                continue

            time_since_seen = current_time - tag.last_seen

            if time_since_seen > threshold:
                # Get last known location
                live_loc = db.query(LiveLocation).filter(
                    LiveLocation.tag_id == tag.tag_id
                ).first()

                last_room = "Unknown"
                if live_loc and live_loc.room:
                    last_room = live_loc.room.room_name

                # Broadcast missing person alert
                await websocket_manager.broadcast({
                    "type": "MISSING_PERSON",
                    "tag_id": tag.tag_id,
                    "user_name": tag.assigned_user.name if tag.assigned_user else "Unknown",
                    "last_room": last_room,
                    "last_seen": int(tag.last_seen.timestamp()),
                    "missing_duration_seconds": int(time_since_seen.total_seconds())
                })

                logger.warning(
                    f"Missing person alert: {tag.tag_id} "
                    f"(last seen {time_since_seen.total_seconds():.0f}s ago in {last_room})"
                )


# Global missing person detector instance
missing_person_detector = MissingPersonDetector()
