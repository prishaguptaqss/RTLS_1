"""
Location service - handles all location event processing.
CRITICAL: This is the core business logic of the RTLS system.
"""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict
import logging

from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.location_history import LocationHistory
from app.schemas.location import LocationEvent
from app.utils.enums import EventType, TagStatus
from app.services.room_cache import room_cache
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


class LocationService:
    """
    Processes location events from Python MQTT service.

    All operations are performed within database transactions to ensure consistency.
    """

    async def process_event(self, db: Session, event: LocationEvent) -> Dict[str, str]:
        """
        Process incoming location event atomically within a transaction.

        Args:
            db: Database session
            event: Location event from Python service

        Returns:
            dict: Response with status and message

        Raises:
            Exception: If event processing fails (transaction will be rolled back)
        """
        try:
            if event.event_type == EventType.LOCATION_CHANGE:
                return await self._handle_location_change(db, event)
            elif event.event_type == EventType.INITIAL_LOCATION:
                return await self._handle_initial_location(db, event)
            elif event.event_type == EventType.TAG_LOST:
                return await self._handle_tag_lost(db, event)
            else:
                raise ValueError(f"Unknown event type: {event.event_type}")

        except Exception as e:
            logger.error(f"Error processing event {event.event_type} for tag {event.tag_id}: {e}", exc_info=True)
            db.rollback()
            raise

    async def _handle_location_change(self, db: Session, event: LocationEvent) -> Dict[str, str]:
        """
        Handle LOCATION_CHANGE event.

        Steps:
        1. Lookup from_room and to_room by name
        2. Get or create tag
        3. Update tag: last_seen, status='active'
        4. Update live_locations: SET room_id = to_room
        5. Close previous location_history row: SET exited_at = timestamp
        6. Insert new location_history row
        7. Broadcast WebSocket event
        """
        timestamp = datetime.fromtimestamp(event.timestamp)

        # Lookup rooms (using cache)
        from_room = await room_cache.get_room_by_name(db, event.from_room) if event.from_room else None
        to_room = await room_cache.get_room_by_name(db, event.to_room) if event.to_room else None

        if not to_room and event.to_room:
            logger.warning(f"Unknown room: {event.to_room} for tag {event.tag_id}")
            # Continue processing with room_id=None

        # Get or create tag
        tag = db.query(Tag).filter(Tag.tag_id == event.tag_id).first()
        if not tag:
            logger.info(f"Creating new tag: {event.tag_id}")
            tag = Tag(tag_id=event.tag_id, status=TagStatus.active, last_seen=timestamp)
            db.add(tag)
        else:
            tag.last_seen = timestamp
            tag.status = TagStatus.active

        # Update live location
        live_loc = db.query(LiveLocation).filter(LiveLocation.tag_id == event.tag_id).first()
        if live_loc:
            live_loc.room_id = to_room.id if to_room else None
            live_loc.updated_at = timestamp
        else:
            live_loc = LiveLocation(
                tag_id=event.tag_id,
                room_id=to_room.id if to_room else None,
                updated_at=timestamp
            )
            db.add(live_loc)

        # Close previous history entry
        prev_history = db.query(LocationHistory).filter(
            LocationHistory.tag_id == event.tag_id,
            LocationHistory.exited_at.is_(None)
        ).first()
        if prev_history:
            prev_history.exited_at = timestamp

        # Insert new history entry
        new_history = LocationHistory(
            tag_id=event.tag_id,
            room_id=to_room.id if to_room else None,
            entered_at=timestamp
        )
        db.add(new_history)

        db.commit()
        logger.info(f"LOCATION_CHANGE: Tag {event.tag_id} moved to {event.to_room}")

        # Broadcast WebSocket event
        await self._broadcast_location_update(tag, to_room.room_name if to_room else "Unknown", timestamp)

        return {"status": "success", "message": "Location updated"}

    async def _handle_initial_location(self, db: Session, event: LocationEvent) -> Dict[str, str]:
        """
        Handle INITIAL_LOCATION event (first time seeing tag).

        Steps:
        1. Lookup to_room by name
        2. Create or update tag
        3. Insert live_locations
        4. Insert location_history
        5. Broadcast WebSocket event
        """
        timestamp = datetime.fromtimestamp(event.timestamp)
        to_room = await room_cache.get_room_by_name(db, event.to_room) if event.to_room else None

        if not to_room and event.to_room:
            logger.warning(f"Unknown room: {event.to_room} for tag {event.tag_id}")

        # Create or update tag
        tag = db.query(Tag).filter(Tag.tag_id == event.tag_id).first()
        if not tag:
            logger.info(f"Creating new tag: {event.tag_id}")
            tag = Tag(tag_id=event.tag_id, status=TagStatus.active, last_seen=timestamp)
            db.add(tag)
        else:
            tag.last_seen = timestamp
            tag.status = TagStatus.active

        # Insert live location
        live_loc = LiveLocation(
            tag_id=event.tag_id,
            room_id=to_room.id if to_room else None,
            updated_at=timestamp
        )
        db.add(live_loc)

        # Insert history entry
        history = LocationHistory(
            tag_id=event.tag_id,
            room_id=to_room.id if to_room else None,
            entered_at=timestamp
        )
        db.add(history)

        db.commit()
        logger.info(f"INITIAL_LOCATION: Tag {event.tag_id} detected in {event.to_room}")

        # Broadcast WebSocket event
        await self._broadcast_location_update(tag, to_room.room_name if to_room else "Unknown", timestamp)

        return {"status": "success", "message": "Initial location recorded"}

    async def _handle_tag_lost(self, db: Session, event: LocationEvent) -> Dict[str, str]:
        """
        Handle TAG_LOST event (tag not seen for X seconds).

        Steps:
        1. Update tag status to 'offline'
        2. Close open location_history entry
        3. Broadcast WebSocket event
        """
        timestamp = datetime.fromtimestamp(event.timestamp)

        # Update tag status
        tag = db.query(Tag).filter(Tag.tag_id == event.tag_id).first()
        if tag:
            tag.status = TagStatus.offline
        else:
            logger.warning(f"TAG_LOST event for unknown tag: {event.tag_id}")
            return {"status": "error", "message": "Tag not found"}

        # Close open history entry
        history = db.query(LocationHistory).filter(
            LocationHistory.tag_id == event.tag_id,
            LocationHistory.exited_at.is_(None)
        ).first()
        if history:
            history.exited_at = timestamp

        db.commit()
        logger.info(f"TAG_LOST: Tag {event.tag_id} marked as offline")

        # Broadcast WebSocket event
        await websocket_manager.broadcast({
            "type": "TAG_LOST",
            "tag_id": event.tag_id,
            "user_name": tag.assigned_user.name if tag.assigned_user else "Unknown",
            "last_room": event.last_room or "Unknown",
            "timestamp": event.timestamp
        })

        return {"status": "success", "message": "Tag marked as lost"}

    async def _broadcast_location_update(self, tag: Tag, room_name: str, timestamp: datetime):
        """
        Broadcast location update to all WebSocket clients.

        Args:
            tag: Tag object
            room_name: Name of the room
            timestamp: Timestamp of the event
        """
        await websocket_manager.broadcast({
            "type": "LOCATION_UPDATE",
            "tag_id": tag.tag_id,
            "user_name": tag.assigned_user.name if tag.assigned_user else "Unknown",
            "room": room_name,
            "timestamp": int(timestamp.timestamp())
        })


# Global location service instance
location_service = LocationService()
