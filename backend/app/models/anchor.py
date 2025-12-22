"""
Anchor model - represents ESP32 gateways that detect BLE beacons.
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.enums import AnchorStatus


class Anchor(Base):
    """
    Anchor table - stores ESP32 gateway devices.

    Anchors (gateways) are placed in rooms to detect BLE tags.
    Each anchor is typically associated with one room.
    """
    __tablename__ = "anchors"

    anchor_id = Column(
        String,
        primary_key=True,
        comment="Unique anchor identifier (e.g., 'Room 101', 'Gateway-A')"
    )
    anchor_name = Column(
        String,
        nullable=True,
        comment="Optional human-readable name for the anchor (can be common across organizations)"
    )
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        comment="Organization this anchor belongs to"
    )
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        comment="Foreign key to rooms table (nullable for unassigned anchors)"
    )
    status = Column(
        Enum(AnchorStatus),
        default=AnchorStatus.active,
        nullable=False,
        comment="Anchor status (active/offline)"
    )
    last_seen = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last time anchor reported data"
    )

    # Relationships
    # SET NULL: if room is deleted, anchor becomes unassigned (not deleted)
    organization = relationship("Organization", back_populates="anchors")
    room = relationship("Room", back_populates="anchors")

    def __repr__(self):
        return f"<Anchor(anchor_id='{self.anchor_id}', status='{self.status}', room_id={self.room_id})>"
