"""
Room cache service - provides fast in-memory lookups for rooms by name.
CRITICAL: This is used extensively during event processing.
"""
from sqlalchemy.orm import Session
from app.models.room import Room
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class RoomCache:
    """
    In-memory cache for room lookups by name.

    Design:
    - Simple dictionary-based cache (fast lookups)
    - FIFO eviction when cache is full
    - Invalidation support for CRUD operations
    """

    def __init__(self, maxsize: int = 256):
        """
        Initialize room cache.

        Args:
            maxsize: Maximum number of rooms to cache
        """
        self.maxsize = maxsize
        self._cache = {}

    async def get_room_by_name(self, db: Session, room_name: str) -> Optional[Room]:
        """
        Get room by name with caching.

        Args:
            db: Database session
            room_name: Name of the room (e.g., "Room 104")

        Returns:
            Room object if found, None otherwise
        """
        # Check cache first
        if room_name in self._cache:
            logger.debug(f"Room cache HIT: {room_name}")
            return self._cache[room_name]

        logger.debug(f"Room cache MISS: {room_name}")

        # Query database
        room = db.query(Room).filter(Room.room_name == room_name).first()

        # Cache result (even if None to avoid repeated DB queries)
        if len(self._cache) >= self.maxsize:
            # Simple FIFO eviction (pop first item)
            self._cache.pop(next(iter(self._cache)))

        self._cache[room_name] = room
        return room

    def invalidate(self, room_name: str = None):
        """
        Invalidate cache for specific room or entire cache.

        Args:
            room_name: Room name to invalidate (None = invalidate all)

        Call this when rooms are created/updated/deleted.
        """
        if room_name:
            self._cache.pop(room_name, None)
            logger.info(f"Room cache invalidated for: {room_name}")
        else:
            self._cache.clear()
            logger.info("Room cache cleared completely")


# Global room cache instance
room_cache = RoomCache()
