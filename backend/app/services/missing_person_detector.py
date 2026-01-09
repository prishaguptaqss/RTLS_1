"""
Missing person detector - background task that monitors tags for inactivity.
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import asyncio
import logging

from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.patient import Patient
from app.models.notification import Notification
from app.models.organization_settings import OrganizationSettings
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
        Uses per-organization untracked threshold from organization_settings.

        Args:
            db: Database session
        """
        current_time = datetime.now(timezone.utc)

        # Query active tags
        active_tags = db.query(Tag).filter(Tag.status == TagStatus.active).all()

        logger.debug(f"Checking {len(active_tags)} active tags for missing persons")

        for tag in active_tags:
            # Get organization-specific threshold
            org_settings = db.query(OrganizationSettings).filter(
                OrganizationSettings.organization_id == tag.organization_id
            ).first()

            # Use per-organization threshold, or fall back to global default
            threshold_seconds = org_settings.untracked_threshold_seconds if org_settings else settings.MISSING_PERSON_THRESHOLD_SECONDS
            threshold = timedelta(seconds=threshold_seconds)
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

                # Load patient details if tag is assigned to a patient
                patient_name = None
                patient_id_value = None

                if tag.assigned_patient_id:
                    patient = db.query(Patient).filter(Patient.patient_id == tag.assigned_patient_id).first()
                    if patient:
                        patient_name = patient.patient_name
                        patient_id_value = patient.patient_id

                # Calculate severity based on missing duration (using org-specific threshold)
                severity = self._calculate_severity(int(time_since_seen.total_seconds()), threshold_seconds)

                # Persist notification to database
                notification = Notification(
                    organization_id=tag.organization_id,
                    type=NotificationType.MISSING_PERSON,
                    tag_id=tag.tag_id,
                    patient_id=patient_id_value,
                    patient_name=patient_name,
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
                    "patient_name": patient_name,
                    "patient_id": patient_id_value,
                    "user_name": tag.assigned_user.name if tag.assigned_user else None,
                    "last_room": last_room,
                    "last_seen": int(tag.last_seen.timestamp()),
                    "missing_duration_seconds": int(time_since_seen.total_seconds()),
                    "severity": severity,
                    "organization_id": tag.organization_id
                })

                logger.warning(
                    f"Missing person alert: {tag.tag_id} "
                    f"(patient: {patient_name or 'N/A'}, "
                    f"last seen {time_since_seen.total_seconds():.0f}s ago in {last_room}, "
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
