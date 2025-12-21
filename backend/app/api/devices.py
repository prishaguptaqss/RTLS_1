"""
Device (Anchor) CRUD endpoints.
Note: Frontend expects "devices" not "anchors".
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.anchor import Anchor, AnchorCreate, AnchorUpdate
from app.models.anchor import Anchor as AnchorModel
from app.api.deps import get_db, get_current_organization
from app.models.organization import Organization

router = APIRouter()


@router.get("/", response_model=List[Anchor])
async def list_devices(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all devices (anchors) within the organization."""
    return db.query(AnchorModel).filter(AnchorModel.organization_id == organization.id).all()


@router.get("/unassigned", response_model=List[Anchor])
async def list_unassigned_devices(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all unassigned devices (anchors without room assignment) within the organization."""
    return db.query(AnchorModel).filter(
        AnchorModel.organization_id == organization.id,
        AnchorModel.room_id == None
    ).all()


@router.post("/", response_model=Anchor, status_code=201)
async def create_device(
    device: AnchorCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Create a new device (anchor) within the organization."""
    # Check if anchor_id already exists in this organization
    existing_device = db.query(AnchorModel).filter(
        AnchorModel.anchor_id == device.anchor_id,
        AnchorModel.organization_id == organization.id
    ).first()
    if existing_device:
        raise HTTPException(status_code=400, detail=f"Anchor with anchor_id '{device.anchor_id}' already exists in this organization")

    db_device = AnchorModel(**device.model_dump(), organization_id=organization.id)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@router.get("/{device_id}", response_model=Anchor)
async def get_device(device_id: str, db: Session = Depends(get_db)):
    """Get device by ID."""
    device = db.query(AnchorModel).filter(AnchorModel.anchor_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.put("/{device_id}", response_model=Anchor)
async def update_device(device_id: str, device_update: AnchorUpdate, db: Session = Depends(get_db)):
    """Update device."""
    device = db.query(AnchorModel).filter(AnchorModel.anchor_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    update_data = device_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)

    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=204)
async def delete_device(device_id: str, db: Session = Depends(get_db)):
    """Delete device."""
    device = db.query(AnchorModel).filter(AnchorModel.anchor_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    db.delete(device)
    db.commit()
    return None
