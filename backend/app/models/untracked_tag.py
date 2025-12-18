"""
UntrackedTag model - stores information about tags that went offline/missing.
"""
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class UntrackedTag(Base):
    """
    UntrackedTag table - stores information about lost/missing tags.

    When a tag is not seen for the threshold period (30 seconds),
    it's marked as untracked and stored here with:
    - Last known position (room)
    - Last seen timestamp
    - User information (if assigned)

    This table helps track missing patients/staff.
    """
    __tablename__ = "untracked_tags"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="Primary key"
    )
    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="CASCADE"),
        nullable=False,
        comment="BLE MAC address of the lost tag"
    )
    user_id = Column(
        String,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        comment="User who was assigned this tag (nullable)"
    )
    user_name = Column(
        String,
        nullable=True,
        comment="Cached user name for display (denormalized for performance)"
    )
    last_room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        comment="Last known room where tag was seen"
    )
    last_room_name = Column(
        String,
        nullable=True,
        comment="Cached room name for display (denormalized for performance)"
    )
    last_seen_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Last time the tag was detected before going offline"
    )
    marked_untracked_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When the tag was marked as untracked/lost"
    )

    # Relationships
    tag = relationship("Tag", back_populates="untracked_records")
    user = relationship("User")
    room = relationship("Room")

    def __repr__(self):
        return f"<UntrackedTag(id={self.id}, tag_id='{self.tag_id}', user_name='{self.user_name}', last_room='{self.last_room_name}')>"
