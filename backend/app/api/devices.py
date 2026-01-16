"""
Device (Anchor) CRUD endpoints.
Note: Frontend expects "devices" not "anchors".
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.anchor import Anchor, AnchorCreate, AnchorUpdate, AnchorLookupResponse
from app.models.anchor import Anchor as AnchorModel
from app.api.deps import get_db, get_current_organization, require_permission
from app.models.organization import Organization
from app.utils.permissions import Permission
from app.utils.enums import AnchorStatus

router = APIRouter()


@router.get("/", response_model=List[Anchor], dependencies=[Depends(require_permission(Permission.DEVICE_VIEW))])
async def list_devices(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all devices (anchors) within the organization."""
    return db.query(AnchorModel).filter(AnchorModel.organization_id == organization.id).all()


@router.get("/unassigned", response_model=List[Anchor], dependencies=[Depends(require_permission(Permission.DEVICE_VIEW))])
async def list_unassigned_devices(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all unassigned devices (anchors without room assignment) within the organization."""
    return db.query(AnchorModel).filter(
        AnchorModel.organization_id == organization.id,
        AnchorModel.room_id == None
    ).all()


@router.get("/available", response_model=List[Anchor], dependencies=[Depends(require_permission(Permission.DEVICE_VIEW))])
async def list_available_devices(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    List all available devices (anchors) that can be assigned to rooms.
    This includes all unassigned anchors regardless of status.
    Status filter removed to include recently unassigned anchors.
    Used for populating anchor selection dropdowns when creating/editing rooms.
    """
    return db.query(AnchorModel).filter(
        AnchorModel.organization_id == organization.id,
        AnchorModel.room_id == None
    ).all()


@router.post("/", response_model=Anchor, status_code=201, dependencies=[Depends(require_permission(Permission.DEVICE_CREATE))])
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

    # Auto-set status based on room assignment
    device_data = device.model_dump()
    if device_data.get('room_id'):
        # If room is assigned, force status to active
        device_data['status'] = AnchorStatus.active
    else:
        # If no room assigned, use provided status or default to inactive_in_store
        if device_data.get('status') == AnchorStatus.active:
            raise HTTPException(status_code=400, detail="Cannot set status to 'active' without assigning to a room")
        # Keep provided status or use default from schema

    db_device = AnchorModel(**device_data, organization_id=organization.id)
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


@router.get("/{device_id}", response_model=Anchor, dependencies=[Depends(require_permission(Permission.DEVICE_VIEW))])
async def get_device(device_id: str, db: Session = Depends(get_db)):
    """Get device by ID."""
    device = db.query(AnchorModel).filter(AnchorModel.anchor_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.get("/{device_id}/organization", response_model=AnchorLookupResponse)
async def get_device_organization(device_id: str, db: Session = Depends(get_db)):
    """
    Get organization information for an anchor by anchor_id.

    This endpoint is used by test.py (MQTT processor) to dynamically determine
    which organization an anchor belongs to based on the anchor_id received from MQTT.

    No authentication required since anchor_id is a unique identifier and this is
    used for internal service-to-service communication.

    Args:
        device_id: The anchor_id (e.g., "E2:D5:A0:F5:79:99" or "ANCHOR-A1")
        db: Database session

    Returns:
        AnchorLookupResponse with organization_id, room info, and status

    Raises:
        HTTPException 404: If anchor not found

    Example Response:
        {
            "anchor_id": "E2:D5:A0:F5:79:99",
            "organization_id": 1,
            "room_id": 45,
            "room_name": "Room 101",
            "status": "active"
        }
    """
    # Case-insensitive lookup (BLE MAC addresses can come in various cases)
    from sqlalchemy import func
    anchor = db.query(AnchorModel).filter(
        func.lower(AnchorModel.anchor_id) == func.lower(device_id)
    ).first()

    if not anchor:
        raise HTTPException(
            status_code=404,
            detail=f"Anchor with ID '{device_id}' not found"
        )

    # Get room name if anchor is assigned to a room
    room_name = None
    if anchor.room_id:
        from app.models.room import Room
        room = db.query(Room).filter(Room.id == anchor.room_id).first()
        if room:
            room_name = room.room_name

    return AnchorLookupResponse(
        anchor_id=anchor.anchor_id,
        organization_id=anchor.organization_id,
        room_id=anchor.room_id,
        room_name=room_name,
        status=anchor.status
    )


@router.put("/{device_id}", response_model=Anchor, dependencies=[Depends(require_permission(Permission.DEVICE_EDIT))])
async def update_device(device_id: str, device_update: AnchorUpdate, db: Session = Depends(get_db)):
    """Update device."""
    device = db.query(AnchorModel).filter(AnchorModel.anchor_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    update_data = device_update.model_dump(exclude_unset=True)

    # Auto-update status based on room assignment changes
    if 'room_id' in update_data:
        if update_data['room_id'] is not None:
            # Assigning to room → force status to active
            update_data['status'] = AnchorStatus.active
        else:
            # Unassigning from room → require status to be provided (inactive reason)
            if 'status' not in update_data:
                raise HTTPException(status_code=400, detail="Must provide status (inactive reason) when removing room assignment")
            if update_data.get('status') == AnchorStatus.active:
                raise HTTPException(status_code=400, detail="Cannot set status to 'active' without assigning to a room")
            # Validate that status is one of the inactive reasons
            if update_data['status'] not in [AnchorStatus.inactive_defective, AnchorStatus.inactive_in_store]:
                raise HTTPException(status_code=400, detail="Status must be 'inactive_defective' or 'inactive_in_store' when not assigned to a room")
    else:
        # Not changing room assignment, validate status if provided
        if 'status' in update_data:
            if update_data['status'] == AnchorStatus.active and device.room_id is None:
                raise HTTPException(status_code=400, detail="Cannot set status to 'active' without assigning to a room")
            # Allow changing between inactive statuses when not assigned
            if device.room_id is None and update_data['status'] not in [AnchorStatus.inactive_defective, AnchorStatus.inactive_in_store]:
                raise HTTPException(status_code=400, detail="Status must be 'inactive_defective' or 'inactive_in_store' when not assigned to a room")

    for key, value in update_data.items():
        setattr(device, key, value)

    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=204, dependencies=[Depends(require_permission(Permission.DEVICE_DELETE))])
async def delete_device(device_id: str, db: Session = Depends(get_db)):
    """Delete device."""
    device = db.query(AnchorModel).filter(AnchorModel.anchor_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    db.delete(device)
    db.commit()
    return None
