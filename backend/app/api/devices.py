"""
Device (Anchor) CRUD endpoints.
Note: Frontend expects "devices" not "anchors".
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.anchor import Anchor, AnchorCreate, AnchorUpdate
from app.models.anchor import Anchor as AnchorModel
from app.api.deps import get_db

router = APIRouter()


@router.get("/", response_model=List[Anchor])
async def list_devices(db: Session = Depends(get_db)):
    """List all devices (anchors)."""
    return db.query(AnchorModel).all()


@router.get("/unassigned", response_model=List[Anchor])
async def list_unassigned_devices(db: Session = Depends(get_db)):
    """List all unassigned devices (anchors without room assignment)."""
    return db.query(AnchorModel).filter(AnchorModel.room_id == None).all()


@router.post("/", response_model=Anchor, status_code=201)
async def create_device(device: AnchorCreate, db: Session = Depends(get_db)):
    """Create a new device (anchor)."""
    # Check if anchor_id already exists
    existing_device = db.query(AnchorModel).filter(AnchorModel.anchor_id == device.anchor_id).first()
    if existing_device:
        raise HTTPException(status_code=400, detail=f"Anchor with anchor_id '{device.anchor_id}' already exists")

    db_device = AnchorModel(**device.model_dump())
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
