"""
LiveLocation model - stores CURRENT location for each active tag.
CRITICAL: This is updated on every location event.
"""
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class LiveLocation(Base):
    """
    LiveLocation table - stores current location for each tag.

    CRITICAL DESIGN:
    - One row per tag (tag_id is primary key)
    - Updated on every LOCATION_CHANGE or INITIAL_LOCATION event
    - Provides fast lookups for "where is this tag right now?"

    This table is separate from location_history to optimize queries.
    """
    __tablename__ = "live_locations"

    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="CASCADE"),
        primary_key=True,
        comment="Foreign key to tags table (primary key ensures one location per tag)"
    )
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        comment="Current room (nullable if tag is lost or in unknown room)"
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="Last update timestamp (auto-updated on modification)"
    )

    # Relationships
    # CASCADE delete: if tag is deleted, its live location is deleted
    tag = relationship("Tag", back_populates="live_location")
    # SET NULL: if room is deleted, location becomes unknown (not deleted)
    room = relationship("Room", back_populates="live_locations")

    def __repr__(self):
        return f"<LiveLocation(tag_id='{self.tag_id}', room_id={self.room_id}, updated_at={self.updated_at})>"
