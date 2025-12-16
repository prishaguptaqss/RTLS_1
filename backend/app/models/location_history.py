"""
LocationHistory model - stores audit trail of all tag movements.
CRITICAL: This provides historical tracking and analytics.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from app.database import Base


class LocationHistory(Base):
    """
    LocationHistory table - stores complete movement history for all tags.

    CRITICAL DESIGN:
    - One row for each room visit
    - entered_at: timestamp when tag entered the room
    - exited_at: NULL while tag is still in room, set when tag leaves
    - Composite index on (tag_id, entered_at) for efficient history queries

    Example:
    - Tag enters Room 101 at 10:00 -> (tag_id='TAG_123', room_id=101, entered_at='10:00', exited_at=NULL)
    - Tag leaves Room 101 at 10:30 -> (exited_at updated to '10:30')
    - Tag enters Room 102 at 10:30 -> (new row: tag_id='TAG_123', room_id=102, entered_at='10:30', exited_at=NULL)
    """
    __tablename__ = "location_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="CASCADE"),
        nullable=False,
        comment="Foreign key to tags table"
    )
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        comment="Room where tag was located (nullable if room is deleted)"
    )
    entered_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Timestamp when tag entered this room"
    )
    exited_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when tag exited this room (NULL if still in room)"
    )

    # Composite index for efficient queries like "show me tag's history"
    __table_args__ = (
        Index('ix_location_history_tag_entered', 'tag_id', 'entered_at'),
    )

    # Relationships
    # CASCADE delete: if tag is deleted, its history is deleted
    tag = relationship("Tag", back_populates="location_history")
    # SET NULL: if room is deleted, history remains but room_id becomes NULL
    room = relationship("Room", back_populates="location_history")

    def __repr__(self):
        return f"<LocationHistory(id={self.id}, tag_id='{self.tag_id}', room_id={self.room_id}, entered_at={self.entered_at}, exited_at={self.exited_at})>"
