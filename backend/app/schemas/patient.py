"""
Pydantic schemas for Patient model.
"""
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from app.utils.enums import PatientStatus


class PatientBase(BaseModel):
    """Base schema with common patient fields."""
    patient_id: str
    name: str
    age: int
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    status: Optional[PatientStatus] = PatientStatus.admitted

    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        """Validate that age is within reasonable bounds."""
        if v < 0 or v > 150:
            raise ValueError('Age must be between 0 and 150')
        return v


class PatientCreate(PatientBase):
    """Schema for creating a new patient.

    patient_id must be provided and be unique.
    Example formats: 'PAT-001', 'PATIENT-12345'
    assigned_tag_id is optional and can be set during creation.
    """
    assigned_tag_id: Optional[str] = None


class PatientUpdate(BaseModel):
    """Schema for updating a patient (all fields optional).

    NOTE: patient_id cannot be changed after creation.
    assigned_tag_id can be updated to change tag assignment.
    """
    name: Optional[str] = None
    age: Optional[int] = None
    email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    assigned_tag_id: Optional[str] = None

    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        """Validate that age is within reasonable bounds."""
        if v is not None and (v < 0 or v > 150):
            raise ValueError('Age must be between 0 and 150')
        return v


class Patient(PatientBase):
    """Schema for reading a patient (includes database fields)."""
    id: int
    admission_time: datetime
    discharge_time: Optional[datetime] = None
    created_at: datetime
    assigned_tag_id: Optional[str] = None
    tag_name: Optional[str] = None  # Name of the assigned tag (if any)
    tracking_status: Optional[str] = None  # "tracked", "untracked", or None (no tag)
    current_location: Optional[str] = None  # "Building > Floor X > Room" or None
    last_seen: Optional[datetime] = None   # When tag was last detected

    model_config = ConfigDict(from_attributes=True)


class PatientDischarge(BaseModel):
    """Schema for discharging a patient."""
    discharge_notes: Optional[str] = None
