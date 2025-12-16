"""
Room model - represents individual rooms in the hospital.
CRITICAL: This model is used extensively for event processing.
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Room(Base):
    """
    Room table - stores individual rooms within floors.

    CRITICAL: room_name is indexed for fast lookups during event processing.
    Room names must be unique across the entire hospital (not just per floor).

    Examples: "Room 101", "ICU-A", "ER-1"
    """
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    floor_id = Column(
        Integer,
        ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        comment="Foreign key to floors table"
    )
    room_name = Column(
        String,
        nullable=False,
        unique=True,
        index=True,  # CRITICAL: Index for fast event processing lookups
        comment="Unique room name (e.g., 'Room 104', 'ICU-A')"
    )
    room_type = Column(
        String,
        nullable=True,
        comment="Room type (e.g., 'ICU', 'Ward', 'ER', 'Operating Room')"
    )

    # Relationships
    floor = relationship("Floor", back_populates="rooms")
    anchors = relationship("Anchor", back_populates="room")
    live_locations = relationship("LiveLocation", back_populates="room")
    location_history = relationship("LocationHistory", back_populates="room")

    def __repr__(self):
        return f"<Room(id={self.id}, room_name='{self.room_name}', room_type='{self.room_type}')>"
