"""
Tag CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.tag import Tag, TagCreate, TagUpdate
from app.models.tag import Tag as TagModel
from app.api.deps import get_db, get_current_organization
from app.models.organization import Organization

router = APIRouter()


@router.get("/", response_model=List[Tag])
async def list_tags(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all tags within the organization."""
    return db.query(TagModel).filter(TagModel.organization_id == organization.id).all()


@router.get("/available", response_model=List[Tag])
async def list_available_tags(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all available (unassigned) tags within the organization.

    Returns tags where both assigned_user_id and assigned_patient_id are NULL
    and status is 'active'.
    """
    return db.query(TagModel).filter(
        TagModel.organization_id == organization.id,
        TagModel.assigned_user_id == None,
        TagModel.assigned_patient_id == None,
        TagModel.status == "active"
    ).all()


@router.post("/", response_model=Tag, status_code=201)
async def create_tag(
    tag: TagCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Create a new tag within the organization."""
    # Check if tag_id already exists in this organization
    existing_tag = db.query(TagModel).filter(
        TagModel.tag_id == tag.tag_id,
        TagModel.organization_id == organization.id
    ).first()
    if existing_tag:
        raise HTTPException(status_code=400, detail=f"Tag with tag_id '{tag.tag_id}' already exists in this organization")

    # Note: Removed unique name constraint for organization scoping
    # Names can be duplicate across organizations, unique within org if needed

    db_tag = TagModel(**tag.model_dump(), organization_id=organization.id)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.get("/{tag_id}", response_model=Tag)
async def get_tag(
    tag_id: str,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get tag by ID within the organization."""
    tag = db.query(TagModel).filter(
        TagModel.tag_id == tag_id,
        TagModel.organization_id == organization.id
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found in this organization")
    return tag


@router.put("/{tag_id}", response_model=Tag)
async def update_tag(
    tag_id: str,
    tag_update: TagUpdate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update tag within the organization."""
    from app.models.patient_tag_assignment import PatientTagAssignment
    from datetime import datetime

    tag = db.query(TagModel).filter(
        TagModel.tag_id == tag_id,
        TagModel.organization_id == organization.id
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found in this organization")

    # Check if name already exists within this organization (if name is being updated)
    update_data = tag_update.model_dump(exclude_unset=True)
    if 'name' in update_data and update_data['name']:
        existing_name = db.query(TagModel).filter(
            TagModel.name == update_data['name'],
            TagModel.tag_id != tag_id,  # Exclude current tag
            TagModel.organization_id == organization.id
        ).first()
        if existing_name:
            raise HTTPException(status_code=400, detail=f"Tag with name '{update_data['name']}' already exists in this organization")

    # Track patient assignment changes for temporal records
    old_patient_id = tag.assigned_patient_id
    new_patient_id = update_data.get('assigned_patient_id')

    # Update tag fields
    for key, value in update_data.items():
        setattr(tag, key, value)

    # Handle patient_tag_assignment temporal records
    if 'assigned_patient_id' in update_data:
        now = datetime.utcnow()

        # Case 1: Unassigning from a patient (new_patient_id is None)
        if old_patient_id is not None and new_patient_id is None:
            # Close the current assignment by setting unassigned_at
            current_assignment = db.query(PatientTagAssignment).filter(
                PatientTagAssignment.tag_id == tag_id,
                PatientTagAssignment.patient_id == old_patient_id,
                PatientTagAssignment.unassigned_at.is_(None)
            ).first()
            if current_assignment:
                current_assignment.unassigned_at = now

        # Case 2: Assigning to a new patient
        elif new_patient_id is not None:
            # If previously assigned to a different patient, close that assignment
            if old_patient_id is not None and old_patient_id != new_patient_id:
                old_assignment = db.query(PatientTagAssignment).filter(
                    PatientTagAssignment.tag_id == tag_id,
                    PatientTagAssignment.patient_id == old_patient_id,
                    PatientTagAssignment.unassigned_at.is_(None)
                ).first()
                if old_assignment:
                    old_assignment.unassigned_at = now

            # Create new assignment record (or reopen if reassigning to same patient)
            existing_assignment = db.query(PatientTagAssignment).filter(
                PatientTagAssignment.tag_id == tag_id,
                PatientTagAssignment.patient_id == new_patient_id,
                PatientTagAssignment.unassigned_at.is_(None)
            ).first()

            if not existing_assignment:
                # Create new assignment record
                new_assignment = PatientTagAssignment(
                    id=f"{new_patient_id}_{tag_id}_{int(now.timestamp())}",
                    patient_id=new_patient_id,
                    tag_id=tag_id,
                    assigned_at=now
                )
                db.add(new_assignment)

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: str,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete tag within the organization."""
    tag = db.query(TagModel).filter(
        TagModel.tag_id == tag_id,
        TagModel.organization_id == organization.id
    ).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found in this organization")

    db.delete(tag)
    db.commit()
    return None
