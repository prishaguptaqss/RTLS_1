"""
Patient model for RTLS system - replaces Entity model.
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Patient(Base):
    """Patient model for tracking patients in the facility."""
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, comment="Unique patient identifier (globally unique)")
    patient_name = Column(String, nullable=False, comment="Patient's full name")
    patient_age = Column(Integer, nullable=True, comment="Patient's age")
    patient_email = Column(String, nullable=True, comment="Patient's email address")
    patient_phone = Column(String, nullable=True, comment="Patient's phone number")
    organization_id = Column(Integer, ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, comment="Organization this patient belongs to")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite unique constraint: patient_id must be unique within organization
    __table_args__ = (
        UniqueConstraint('patient_id', 'organization_id', name='uq_patient_id_org'),
    )

    # Relationships
    organization = relationship("Organization", back_populates="patients")
    tags = relationship("Tag", back_populates="assigned_patient")
    tag_assignments = relationship("PatientTagAssignment", back_populates="patient", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Patient(patient_id='{self.patient_id}', patient_name='{self.patient_name}', organization_id={self.organization_id})>"
