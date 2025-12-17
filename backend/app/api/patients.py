"""
Patient CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.schemas.patient import Patient, PatientCreate, PatientUpdate, PatientDischarge
from app.schemas.location import LocationHistoryResponse, LocationHistoryItem
from app.models.patient import Patient as PatientModel
from app.models.tag import Tag as TagModel
from app.models.location_history import LocationHistory as LocationHistoryModel
from app.models.live_location import LiveLocation as LiveLocationModel
from app.models.room import Room as RoomModel
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.utils.enums import PatientStatus
from app.api.deps import get_db

router = APIRouter()


@router.get("/", response_model=List[Patient])
async def list_patients(
    status: Optional[str] = Query(None, description="Filter by status: admitted or discharged"),
    db: Session = Depends(get_db)
):
    """List all patients with optional status filter."""
    query = db.query(PatientModel)

    if status:
        query = query.filter(PatientModel.status == status)

    patients = query.all()

    # Add assigned_tag_id to response
    for patient in patients:
        tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.id).first()
        patient.assigned_tag_id = tag.tag_id if tag else None

    return patients


@router.post("/", response_model=Patient, status_code=201)
async def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient with optional tag assignment."""
    # Check if patient_id already exists
    existing_patient = db.query(PatientModel).filter(PatientModel.patient_id == patient.patient_id).first()
    if existing_patient:
        raise HTTPException(status_code=400, detail=f"Patient with patient_id '{patient.patient_id}' already exists")

    # If tag is being assigned, verify it exists and is available
    if patient.assigned_tag_id:
        tag = db.query(TagModel).filter(TagModel.tag_id == patient.assigned_tag_id).first()
        if not tag:
            raise HTTPException(status_code=404, detail=f"Tag '{patient.assigned_tag_id}' not found")
        if tag.assigned_user_id or tag.assigned_patient_id:
            raise HTTPException(status_code=400, detail=f"Tag '{patient.assigned_tag_id}' is already assigned")

    # Create patient (exclude assigned_tag_id from model creation)
    patient_data = patient.model_dump(exclude={'assigned_tag_id'})
    db_patient = PatientModel(**patient_data)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    # Assign tag if provided
    if patient.assigned_tag_id:
        tag.assigned_patient_id = db_patient.id
        db.commit()
        db.refresh(tag)
        db_patient.assigned_tag_id = tag.tag_id
    else:
        db_patient.assigned_tag_id = None

    return db_patient


@router.get("/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """Get patient by ID."""
    patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Add assigned tag info
    tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.id).first()
    patient.assigned_tag_id = tag.tag_id if tag else None

    return patient


@router.put("/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient_update: PatientUpdate, db: Session = Depends(get_db)):
    """Update patient information and tag assignment."""
    patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Handle tag assignment changes
    if 'assigned_tag_id' in patient_update.model_dump(exclude_unset=True):
        new_tag_id = patient_update.assigned_tag_id

        # Get current tag if any
        current_tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.id).first()

        # If changing to a different tag (or assigning for first time)
        if new_tag_id:
            # Verify new tag exists and is available
            new_tag = db.query(TagModel).filter(TagModel.tag_id == new_tag_id).first()
            if not new_tag:
                raise HTTPException(status_code=404, detail=f"Tag '{new_tag_id}' not found")

            # Check if tag is available (unless it's the current tag)
            if current_tag and current_tag.tag_id == new_tag_id:
                pass  # Same tag, no change needed
            elif new_tag.assigned_user_id or new_tag.assigned_patient_id:
                raise HTTPException(status_code=400, detail=f"Tag '{new_tag_id}' is already assigned")
            else:
                # Unassign current tag if exists
                if current_tag:
                    current_tag.assigned_patient_id = None
                # Assign new tag
                new_tag.assigned_patient_id = patient.id
        else:
            # Unassigning tag (set to None/null)
            if current_tag:
                current_tag.assigned_patient_id = None

    # Update other patient fields
    update_data = patient_update.model_dump(exclude_unset=True, exclude={'assigned_tag_id'})
    for key, value in update_data.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)

    # Add current tag info to response
    tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.id).first()
    patient.assigned_tag_id = tag.tag_id if tag else None

    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    """Delete patient."""
    patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.delete(patient)
    db.commit()
    return None


@router.post("/{patient_id}/discharge", response_model=Patient)
async def discharge_patient(patient_id: str, discharge_data: PatientDischarge = None, db: Session = Depends(get_db)):
    """
    Discharge a patient.

    This will:
    1. Set discharge_time to current timestamp
    2. Update status to 'discharged'
    3. Unassign the patient's tag (make it available)
    4. Close any open location history records
    """
    patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if patient.status == PatientStatus.discharged:
        raise HTTPException(status_code=400, detail="Patient is already discharged")

    # Set discharge time and status
    patient.discharge_time = datetime.now()
    patient.status = PatientStatus.discharged

    # Find and unassign the patient's tag
    tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.id).first()
    if tag:
        # Unassign tag
        tag.assigned_patient_id = None

        # Close any open location history records for this tag
        open_history_records = db.query(LocationHistoryModel).filter(
            LocationHistoryModel.tag_id == tag.tag_id,
            LocationHistoryModel.exited_at == None
        ).all()

        for record in open_history_records:
            record.exited_at = datetime.now()

    db.commit()
    db.refresh(patient)

    # Return patient with no tag assignment
    patient.assigned_tag_id = None

    return patient


@router.get("/{patient_id}/location-history", response_model=LocationHistoryResponse)
async def get_patient_location_history(patient_id: str, db: Session = Depends(get_db)):
    """
    Get location history for a specific patient.

    Returns all location history records for tags assigned to this patient,
    with full building hierarchy information (Building > Floor > Room).
    """
    # First, verify patient exists
    patient = db.query(PatientModel).filter(PatientModel.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Query location history with joins to get full building hierarchy
    # Join: LocationHistory -> Tag -> Room -> Floor -> Building
    history_records = (
        db.query(
            LocationHistoryModel.id,
            RoomModel.room_name,
            BuildingModel.name.label("building_name"),
            FloorModel.floor_number,
            LocationHistoryModel.entered_at,
            LocationHistoryModel.exited_at
        )
        .join(TagModel, LocationHistoryModel.tag_id == TagModel.tag_id)
        .outerjoin(RoomModel, LocationHistoryModel.room_id == RoomModel.id)
        .outerjoin(FloorModel, RoomModel.floor_id == FloorModel.id)
        .outerjoin(BuildingModel, FloorModel.building_id == BuildingModel.id)
        .filter(TagModel.assigned_patient_id == patient.id)
        .order_by(LocationHistoryModel.entered_at.desc())
        .all()
    )

    # Build response with duration calculation
    history_items = []
    for record in history_records:
        duration_minutes = None
        if record.exited_at and record.entered_at:
            duration_seconds = (record.exited_at - record.entered_at).total_seconds()
            duration_minutes = int(duration_seconds / 60)

        history_items.append(LocationHistoryItem(
            id=record.id,
            room_name=record.room_name or "Unknown Room",
            building_name=record.building_name or "Unknown Building",
            floor_number=record.floor_number or 0,
            entered_at=record.entered_at,
            exited_at=record.exited_at,
            duration_minutes=duration_minutes
        ))

    return LocationHistoryResponse(
        user_id=patient.patient_id,
        user_name=patient.name,
        history=history_items,
        total_records=len(history_items)
    )
