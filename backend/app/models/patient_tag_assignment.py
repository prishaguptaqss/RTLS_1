"""
PatientTagAssignment model - tracks temporal assignment history of tags to patients.
This enables patient-wise location history preservation even after tag unassignment.
"""
from sqlalchemy import Column, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from app.database import Base


class PatientTagAssignment(Base):
    """
    Tracks temporal assignment history of tags to patients.

    Each row represents one assignment period:
    - assigned_at: When the tag was assigned to this patient
    - unassigned_at: When the tag was unassigned (NULL if still assigned)

    This allows historical queries: "What was Patient X's location during period Y?"

    CRITICAL DESIGN:
    - Enables Patient A to keep ALL location history after tag unassignment
    - Enables Patient B to have clean slate when assigned same tag
    - Temporal join: location_history.entered_at BETWEEN assigned_at AND unassigned_at

    Example:
    - Patient A assigned Tag X at 10:00 -> (patient_id=A, tag_id=X, assigned_at=10:00, unassigned_at=NULL)
    - Patient A unassigned Tag X at 12:00 -> (unassigned_at updated to 12:00)
    - Patient B assigned Tag X at 14:00 -> (new row: patient_id=B, tag_id=X, assigned_at=14:00, unassigned_at=NULL)
    - Query Patient A history: shows locations from 10:00-12:00
    - Query Patient B history: shows locations from 14:00 onwards
    """
    __tablename__ = "patient_tag_assignments"

    id = Column(
        String,
        primary_key=True,
        index=True,
        comment="Unique assignment record ID"
    )
    patient_id = Column(
        String,
        ForeignKey("patients.patient_id", ondelete="CASCADE"),
        nullable=False,
        comment="Patient that had the tag assigned"
    )
    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="CASCADE"),
        nullable=False,
        comment="Tag that was assigned to the patient"
    )
    assigned_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Timestamp when tag was assigned to patient"
    )
    unassigned_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when tag was unassigned (NULL if still assigned)"
    )

    # Composite indexes for efficient temporal queries
    __table_args__ = (
        # Index for temporal range queries: "Find assignments for patient X at time Y"
        Index(
            'ix_patient_tag_assignments_temporal',
            'patient_id',
            'tag_id',
            'assigned_at',
            'unassigned_at'
        ),
        # Index for finding current assignments (where unassigned_at IS NULL)
        Index(
            'ix_patient_tag_assignments_current',
            'patient_id',
            'tag_id',
            'unassigned_at'
        ),
    )

    # Relationships
    patient = relationship("Patient", back_populates="tag_assignments")
    tag = relationship("Tag", back_populates="patient_assignments")

    def __repr__(self):
        status = "CURRENT" if self.unassigned_at is None else "HISTORICAL"
        return f"<PatientTagAssignment(id={self.id}, patient_id={self.patient_id}, tag_id='{self.tag_id}', assigned_at={self.assigned_at}, status={status})>"
