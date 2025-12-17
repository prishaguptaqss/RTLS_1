"""
Missing person model - tracks individuals who haven't been detected for a threshold period.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class MissingPerson(Base):
    """
    Missing persons table - creates a record when a person goes missing (no signal for 5+ minutes).

    This table provides:
    - Persistent tracking of missing person incidents
    - Historical audit trail
    - Auto-resolution when person is found
    - Analytics on missing person patterns
    """
    __tablename__ = "missing_persons"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="Auto-incrementing primary key")

    # Tag identification
    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="BLE tag MAC address"
    )

    # Person identification (one will be set, other will be NULL)
    user_id = Column(
        String,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=True,
        comment="Foreign key to users table (if tag assigned to user)"
    )
    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=True,
        comment="Foreign key to patients table (if tag assigned to patient)"
    )

    # Location tracking
    last_seen_room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        comment="Last known room where person was detected"
    )

    # Timeline tracking
    reported_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="When the system detected the missing status"
    )
    last_seen_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Actual timestamp of last signal received from tag"
    )
    missing_duration_seconds = Column(
        Integer,
        nullable=False,
        comment="Duration in seconds that person was missing when reported"
    )

    # Resolution tracking
    found_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When person was found (NULL if still missing)"
    )
    found_in_room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="SET NULL"),
        nullable=True,
        comment="Room where person was found"
    )
    is_resolved = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        comment="True if person has been found, False if still missing"
    )

    # Relationships
    tag = relationship("Tag", back_populates="missing_person_records")
    user = relationship("User", back_populates="missing_person_records")
    patient = relationship("Patient", back_populates="missing_person_records")
    last_seen_room = relationship("Room", foreign_keys=[last_seen_room_id])
    found_in_room = relationship("Room", foreign_keys=[found_in_room_id])

    # Constraints
    __table_args__ = (
        # Ensure tag can only be assigned to user OR patient, not both
        CheckConstraint(
            '(user_id IS NULL OR patient_id IS NULL)',
            name='check_single_person_assignment'
        ),
        # Composite index for fast queries of unresolved missing persons
        Index('idx_unresolved_missing', 'is_resolved', 'reported_at'),
    )

    def __repr__(self):
        status = "RESOLVED" if self.is_resolved else "MISSING"
        person_type = "user" if self.user_id else "patient" if self.patient_id else "unknown"
        return f"<MissingPerson(id={self.id}, tag='{self.tag_id}', {person_type}, status={status})>"
