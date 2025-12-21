"""
Room model - represents individual rooms in the hospital.
CRITICAL: This model is used extensively for event processing.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Room(Base):
    """
    Room table - stores individual rooms within floors.

    CRITICAL: room_name is indexed for fast lookups during event processing.
    Room names must be unique within an organization (not globally).
    Different organizations can have rooms with the same name.

    Examples: "Room 101", "ICU-A", "ER-1"
    """
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Organization this room belongs to"
    )
    floor_id = Column(
        Integer,
        ForeignKey("floors.id", ondelete="CASCADE"),
        nullable=False,
        comment="Foreign key to floors table"
    )
    room_name = Column(
        String,
        nullable=False,
        index=True,  # CRITICAL: Index for fast event processing lookups
        comment="Room name (e.g., 'Room 104', 'ICU-A') - unique within organization"
    )
    room_type = Column(
        String,
        nullable=True,
        comment="Room type (e.g., 'ICU', 'Ward', 'ER', 'Operating Room')"
    )

    # Composite unique constraint: room name must be unique within organization
    __table_args__ = (
        UniqueConstraint('room_name', 'organization_id', name='uq_room_name_org'),
    )

    # Relationships
    organization = relationship("Organization")
    floor = relationship("Floor", back_populates="rooms")
    anchors = relationship("Anchor", back_populates="room")
    live_locations = relationship("LiveLocation", back_populates="room")
    location_history = relationship("LocationHistory", back_populates="room")

    def __repr__(self):
        return f"<Room(id={self.id}, room_name='{self.room_name}', org_id={self.organization_id})>"
