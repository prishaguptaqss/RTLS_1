"""
Tag model - represents BLE beacons worn by tracked individuals.
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.enums import TagStatus


class Tag(Base):
    """
    Tag table - stores BLE beacon information.

    Each tag (BLE beacon) can be assigned to one user.
    The tag_id is the BLE MAC address (e.g., "E0:C0:74:C6:AD:C8").
    """
    __tablename__ = "tags"

    tag_id = Column(
        String,
        primary_key=True,
        comment="BLE MAC address (e.g., 'E0:C0:74:C6:AD:C8')"
    )
    assigned_user_id = Column(
        String,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        comment="Foreign key to users table (nullable for unassigned tags)"
    )
    status = Column(
        Enum(TagStatus),
        default=TagStatus.active,
        nullable=False,
        comment="Tag status (active/offline)"
    )
    last_seen = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last time tag was detected (updated on every event)"
    )

    # Relationships
    # SET NULL: if user is deleted, tag becomes unassigned (not deleted)
    assigned_user = relationship("User", back_populates="tags")
    live_location = relationship("LiveLocation", back_populates="tag", uselist=False, cascade="all, delete-orphan")
    location_history = relationship("LocationHistory", back_populates="tag", cascade="all, delete-orphan")
    untracked_records = relationship("UntrackedTag", back_populates="tag", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tag(tag_id='{self.tag_id}', status='{self.status}', assigned_user_id={self.assigned_user_id})>"
