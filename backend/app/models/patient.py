"""
Patient model - represents hospital patients being tracked.
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import PatientStatus


class Patient(Base):
    """
    Patient table - stores information about hospital patients.

    Each patient can be assigned a BLE tag for location tracking during their stay.
    Tracks admission and discharge times.
    """
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="Internal database ID")
    patient_id = Column(String, unique=True, nullable=False, index=True, comment="Hospital patient identifier (e.g., 'PAT-001')")
    name = Column(String, nullable=False, comment="Full name of the patient")
    age = Column(Integer, nullable=False, comment="Patient age")
    email = Column(String, nullable=True, comment="Email address (optional)")
    mobile_number = Column(String, nullable=True, comment="Mobile phone number (optional)")
    admission_time = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Timestamp when patient was admitted"
    )
    discharge_time = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when patient was discharged (NULL if still admitted)"
    )
    status = Column(
        Enum(PatientStatus),
        default=PatientStatus.admitted,
        nullable=False,
        comment="Patient status (admitted/discharged)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="Record creation timestamp"
    )

    # Relationships
    tags = relationship("Tag", back_populates="assigned_patient")

    def __repr__(self):
        return f"<Patient(patient_id='{self.patient_id}', name='{self.name}', status='{self.status}')>"
