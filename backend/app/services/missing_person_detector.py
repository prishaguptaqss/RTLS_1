"""
Missing person detector - background task that monitors tags for inactivity.
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import asyncio
import logging

from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.missing_person import MissingPerson
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
        Check for missing persons, create database records, and broadcast alerts.

        Args:
            db: Database session
        """
        threshold = timedelta(seconds=settings.MISSING_PERSON_THRESHOLD_SECONDS)
        current_time = datetime.utcnow()

        # Query active tags (only check assigned tags)
        active_tags = db.query(Tag).filter(
            Tag.status == TagStatus.active
        ).filter(
            (Tag.assigned_user_id.isnot(None)) | (Tag.assigned_patient_id.isnot(None))
        ).all()

        logger.debug(f"Checking {len(active_tags)} active tags for missing persons")

        for tag in active_tags:
            if not tag.last_seen:
                continue

            time_since_seen = current_time - tag.last_seen

            if time_since_seen > threshold:
                # Check if already reported as missing (unresolved record exists)
                existing_missing = db.query(MissingPerson).filter(
                    MissingPerson.tag_id == tag.tag_id,
                    MissingPerson.is_resolved == False
                ).first()

                if existing_missing:
                    # Already reported, skip (avoid duplicate records)
                    continue

                # NEW MISSING PERSON - Create database record
                # Get last known location
                live_loc = db.query(LiveLocation).filter(
                    LiveLocation.tag_id == tag.tag_id
                ).first()

                last_room_id = live_loc.room_id if live_loc else None
                last_room = "Unknown"
                if live_loc and live_loc.room:
                    last_room = live_loc.room.room_name

                # Create missing person record
                missing_record = MissingPerson(
                    tag_id=tag.tag_id,
                    user_id=tag.assigned_user_id,
                    patient_id=tag.assigned_patient_id,
                    last_seen_room_id=last_room_id,
                    last_seen_at=tag.last_seen,
                    missing_duration_seconds=int(time_since_seen.total_seconds()),
                    is_resolved=False
                )
                db.add(missing_record)
                db.commit()

                # Get person name for alert
                person_name = "Unknown"
                if tag.assigned_user:
                    person_name = tag.assigned_user.name
                elif tag.assigned_patient:
                    person_name = tag.assigned_patient.name

                # Broadcast missing person alert
                await websocket_manager.broadcast({
                    "type": "MISSING_PERSON",
                    "tag_id": tag.tag_id,
                    "person_name": person_name,
                    "last_room": last_room,
                    "last_seen": int(tag.last_seen.timestamp()),
                    "missing_duration_seconds": int(time_since_seen.total_seconds())
                })

                logger.warning(
                    f"NEW MISSING PERSON: {person_name} ({tag.tag_id}) "
                    f"last seen {time_since_seen.total_seconds():.0f}s ago in {last_room}"
                )


# Global missing person detector instance
missing_person_detector = MissingPersonDetector()
