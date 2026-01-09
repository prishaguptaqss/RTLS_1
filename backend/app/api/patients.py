"""
Patient CRUD endpoints for RTLS system.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import sqlalchemy as sa

from app.schemas.patient import Patient, PatientCreate, PatientUpdate
from app.schemas.location import LocationHistoryResponse, LocationHistoryItem
from app.models.patient import Patient as PatientModel
from app.models.patient_tag_assignment import PatientTagAssignment
from app.models.tag import Tag as TagModel
from app.models.location_history import LocationHistory as LocationHistoryModel
from app.models.live_location import LiveLocation as LiveLocationModel
from app.models.room import Room as RoomModel
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.utils.enums import TagStatus
from app.api.deps import get_db, get_current_organization, require_permission
from app.models.organization import Organization
from app.utils.permissions import Permission

router = APIRouter()


@router.get("/", response_model=List[Patient], dependencies=[Depends(require_permission(Permission.PATIENT_VIEW))])
async def list_patients(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all patients within the organization."""
    patients = db.query(PatientModel).filter(PatientModel.organization_id == organization.id).all()

    # Add assigned_tag_id and tracking info to response
    for patient in patients:
        tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.patient_id).first()

        if tag:
            patient.assigned_tag_id = tag.tag_id
            patient.tag_name = tag.name
            patient.tracking_status = "tracked" if tag.status == TagStatus.active else "untracked"
            patient.last_seen = tag.last_seen

            # Get current location from LiveLocation
            live_loc = db.query(LiveLocationModel).filter(LiveLocationModel.tag_id == tag.tag_id).first()
            if live_loc and live_loc.room_id:
                room = db.query(RoomModel).filter(RoomModel.id == live_loc.room_id).first()
                if room:
                    floor = db.query(FloorModel).filter(FloorModel.id == room.floor_id).first() if room.floor_id else None
                    building = db.query(BuildingModel).filter(BuildingModel.id == floor.building_id).first() if floor and floor.building_id else None

                    if building and floor:
                        patient.current_location = f"{building.name} > Floor {floor.floor_number} > {room.room_name}"
                    elif floor:
                        patient.current_location = f"Floor {floor.floor_number} > {room.room_name}"
                    else:
                        patient.current_location = room.room_name
                else:
                    patient.current_location = None
            else:
                patient.current_location = None
        else:
            patient.assigned_tag_id = None
            patient.tag_name = None
            patient.tracking_status = None
            patient.current_location = None
            patient.last_seen = None

    return patients


@router.post("/", response_model=Patient, status_code=201, dependencies=[Depends(require_permission(Permission.PATIENT_ADMIT))])
async def create_patient(
    patient: PatientCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Create a new patient with optional tag assignment."""
    # Check if patient_id already exists within this organization
    existing_patient = db.query(PatientModel).filter(
        PatientModel.patient_id == patient.patient_id,
        PatientModel.organization_id == organization.id
    ).first()
    if existing_patient:
        raise HTTPException(status_code=400, detail=f"Patient with patient_id '{patient.patient_id}' already exists in this organization")

    # If tag is being assigned, verify it exists within the organization and is available
    if patient.assigned_tag_id:
        tag = db.query(TagModel).filter(
            TagModel.tag_id == patient.assigned_tag_id,
            TagModel.organization_id == organization.id
        ).first()
        if not tag:
            raise HTTPException(status_code=404, detail=f"Tag '{patient.assigned_tag_id}' not found in this organization")
        if tag.assigned_user_id or tag.assigned_patient_id:
            raise HTTPException(status_code=400, detail=f"Tag '{patient.assigned_tag_id}' is already assigned")

    # Create patient (exclude assigned_tag_id from model creation)
    patient_data = patient.model_dump(exclude={'assigned_tag_id'})
    db_patient = PatientModel(**patient_data, organization_id=organization.id)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    # Assign tag if provided
    if patient.assigned_tag_id:
        tag.assigned_patient_id = db_patient.patient_id

        # Create assignment record
        assignment = PatientTagAssignment(
            id=f"{db_patient.patient_id}_{tag.tag_id}_{int(datetime.now(timezone.utc).timestamp())}",
            patient_id=db_patient.patient_id,
            tag_id=tag.tag_id,
            assigned_at=datetime.now(timezone.utc),
            unassigned_at=None
        )
        db.add(assignment)

        db.commit()
        db.refresh(tag)
        db_patient.assigned_tag_id = tag.tag_id
    else:
        db_patient.assigned_tag_id = None

    return db_patient


@router.get("/{patient_id}", response_model=Patient)
async def get_patient(
    patient_id: str,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get patient by ID within the organization."""
    patient = db.query(PatientModel).filter(
        PatientModel.patient_id == patient_id,
        PatientModel.organization_id == organization.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in this organization")

    # Add assigned tag info
    tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.patient_id).first()
    patient.assigned_tag_id = tag.tag_id if tag else None

    return patient


@router.put("/{patient_id}", response_model=Patient, dependencies=[Depends(require_permission(Permission.PATIENT_EDIT))])
async def update_patient(
    patient_id: str,
    patient_update: PatientUpdate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update patient information and tag assignment."""
    patient = db.query(PatientModel).filter(
        PatientModel.patient_id == patient_id,
        PatientModel.organization_id == organization.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in this organization")

    # Handle tag assignment changes
    if 'assigned_tag_id' in patient_update.model_dump(exclude_unset=True):
        new_tag_id = patient_update.assigned_tag_id

        # Get current tag if any
        current_tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.patient_id).first()

        # If changing to a different tag (or assigning for first time)
        if new_tag_id:
            # Verify new tag exists within the organization and is available
            new_tag = db.query(TagModel).filter(
                TagModel.tag_id == new_tag_id,
                TagModel.organization_id == organization.id
            ).first()
            if not new_tag:
                raise HTTPException(status_code=404, detail=f"Tag '{new_tag_id}' not found in this organization")

            # Check if tag is available (unless it's the current tag)
            if current_tag and current_tag.tag_id == new_tag_id:
                pass  # Same tag, no change needed
            elif new_tag.assigned_user_id or new_tag.assigned_patient_id:
                raise HTTPException(status_code=400, detail=f"Tag '{new_tag_id}' is already assigned")
            else:
                reassignment_time = datetime.now(timezone.utc)

                # Unassign current tag if exists
                if current_tag:
                    # Close the current assignment record
                    current_assignment = db.query(PatientTagAssignment).filter(
                        PatientTagAssignment.patient_id == patient.patient_id,
                        PatientTagAssignment.tag_id == current_tag.tag_id,
                        PatientTagAssignment.unassigned_at.is_(None)
                    ).first()
                    if current_assignment:
                        current_assignment.unassigned_at = reassignment_time

                    # Close any open location history entry for the old tag
                    open_location = db.query(LocationHistoryModel).filter(
                        LocationHistoryModel.tag_id == current_tag.tag_id,
                        LocationHistoryModel.exited_at.is_(None)
                    ).first()
                    if open_location:
                        open_location.exited_at = reassignment_time

                    # Remove old tag from live location
                    live_location = db.query(LiveLocationModel).filter(
                        LiveLocationModel.tag_id == current_tag.tag_id
                    ).first()
                    if live_location:
                        db.delete(live_location)

                    current_tag.assigned_patient_id = None

                # Create new assignment record
                new_assignment = PatientTagAssignment(
                    id=f"{patient.patient_id}_{new_tag.tag_id}_{int(reassignment_time.timestamp())}",
                    patient_id=patient.patient_id,
                    tag_id=new_tag.tag_id,
                    assigned_at=reassignment_time,
                    unassigned_at=None
                )
                db.add(new_assignment)

                # Assign new tag
                new_tag.assigned_patient_id = patient.patient_id
        else:
            # Unassigning tag (set to None/null)
            if current_tag:
                unassignment_time = datetime.now(timezone.utc)

                # Close the current assignment record
                current_assignment = db.query(PatientTagAssignment).filter(
                    PatientTagAssignment.patient_id == patient.patient_id,
                    PatientTagAssignment.tag_id == current_tag.tag_id,
                    PatientTagAssignment.unassigned_at.is_(None)
                ).first()
                if current_assignment:
                    current_assignment.unassigned_at = unassignment_time

                # Close any open location history entry
                open_location = db.query(LocationHistoryModel).filter(
                    LocationHistoryModel.tag_id == current_tag.tag_id,
                    LocationHistoryModel.exited_at.is_(None)
                ).first()
                if open_location:
                    open_location.exited_at = unassignment_time

                # Remove from live location
                live_location = db.query(LiveLocationModel).filter(
                    LiveLocationModel.tag_id == current_tag.tag_id
                ).first()
                if live_location:
                    db.delete(live_location)

                current_tag.assigned_patient_id = None

    # Update other patient fields
    update_data = patient_update.model_dump(exclude_unset=True, exclude={'assigned_tag_id'})
    for key, value in update_data.items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)

    # Add current tag info to response
    tag = db.query(TagModel).filter(TagModel.assigned_patient_id == patient.patient_id).first()
    patient.assigned_tag_id = tag.tag_id if tag else None

    return patient


@router.delete("/{patient_id}", status_code=204, dependencies=[Depends(require_permission(Permission.PATIENT_DELETE))])
async def delete_patient(
    patient_id: str,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete patient within the organization."""
    patient = db.query(PatientModel).filter(
        PatientModel.patient_id == patient_id,
        PatientModel.organization_id == organization.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in this organization")

    db.delete(patient)
    db.commit()
    return None


@router.get("/{patient_id}/location-history", response_model=LocationHistoryResponse)
async def get_patient_location_history(
    patient_id: str,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    Get location history for a specific patient within the organization.

    Returns all location history records for tags that were assigned to this patient
    during the time periods they were assigned, with full building hierarchy information.

    Uses temporal assignment records to filter history by assignment periods.
    Patient keeps ALL history even after tag unassignment.
    """
    # First, verify patient exists within this organization
    patient = db.query(PatientModel).filter(
        PatientModel.patient_id == patient_id,
        PatientModel.organization_id == organization.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in this organization")

    # Query location history with temporal join through assignment periods
    history_records = (
        db.query(
            LocationHistoryModel.id,
            RoomModel.room_name,
            BuildingModel.name.label("building_name"),
            FloorModel.floor_number,
            LocationHistoryModel.entered_at,
            LocationHistoryModel.exited_at
        )
        .join(
            PatientTagAssignment,
            LocationHistoryModel.tag_id == PatientTagAssignment.tag_id
        )
        .outerjoin(RoomModel, LocationHistoryModel.room_id == RoomModel.id)
        .outerjoin(FloorModel, RoomModel.floor_id == FloorModel.id)
        .outerjoin(BuildingModel, FloorModel.building_id == BuildingModel.id)
        .filter(
            PatientTagAssignment.patient_id == patient.patient_id,
            # Temporal filter - location must fall within assignment period
            LocationHistoryModel.entered_at >= PatientTagAssignment.assigned_at,
            sa.or_(
                PatientTagAssignment.unassigned_at.is_(None),
                LocationHistoryModel.entered_at < PatientTagAssignment.unassigned_at
            )
        )
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
        user_name=patient.patient_name or patient.patient_id,
        history=history_items,
        total_records=len(history_items)
    )
