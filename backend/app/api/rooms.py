"""
Room CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.room import Room, RoomCreate, RoomUpdate
from app.models.room import Room as RoomModel
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.models.organization import Organization
from app.services.room_cache import room_cache
from app.api.deps import get_db, get_current_organization

router = APIRouter()


@router.get("/", response_model=List[Room])
async def list_rooms(
    organization: Organization = Depends(get_current_organization),
    floor_id: Optional[int] = Query(None, description="Filter by floor ID"),
    building_id: Optional[int] = Query(None, description="Filter by building ID"),
    db: Session = Depends(get_db)
):
    """List all rooms within the organization, optionally filtered by floor or building."""
    # Join with floors and buildings to filter by organization
    query = db.query(RoomModel).join(FloorModel).join(BuildingModel).filter(
        BuildingModel.organization_id == organization.id
    )

    if floor_id:
        query = query.filter(RoomModel.floor_id == floor_id)
    if building_id:
        query = query.filter(BuildingModel.id == building_id)

    rooms = query.all()
    # Add building_id to each room from its floor relationship
    for room in rooms:
        if room.floor:
            room.building_id = room.floor.building_id
    return rooms


@router.post("/", response_model=Room, status_code=201)
async def create_room(
    room: RoomCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Create a new room."""
    # Verify the floor exists and belongs to this organization
    from app.models.floor import Floor as FloorModel
    floor = db.query(FloorModel).join(BuildingModel).filter(
        FloorModel.id == room.floor_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    # Check if room with same name already exists in this organization
    existing_room = db.query(RoomModel).filter(
        RoomModel.room_name == room.room_name,
        RoomModel.organization_id == organization.id
    ).first()
    if existing_room:
        raise HTTPException(status_code=400, detail=f"Room '{room.room_name}' already exists in this organization")

    # Handle anchor assignment if provided
    anchor_id = room.anchor_id
    room_data = room.model_dump(exclude={'anchor_id'})

    # Auto-assign organization_id
    room_data['organization_id'] = organization.id

    db_room = RoomModel(**room_data)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)

    # Assign anchor to this room if provided
    if anchor_id:
        from app.models.anchor import Anchor as AnchorModel
        anchor = db.query(AnchorModel).filter(
            AnchorModel.anchor_id == anchor_id,
            AnchorModel.organization_id == organization.id
        ).first()
        if anchor:
            # Unassign anchor from any previous room
            if anchor.room_id:
                pass  # Just reassign
            anchor.room_id = db_room.id
            db.commit()
        else:
            # Rollback room creation if anchor not found
            db.delete(db_room)
            db.commit()
            raise HTTPException(status_code=404, detail=f"Anchor '{anchor_id}' not found")

    # Add building_id from floor relationship
    db_room.building_id = floor.building_id

    # Invalidate room cache for this room name
    room_cache.invalidate(db_room.room_name)

    return db_room


@router.get("/{room_id}", response_model=Room)
async def get_room(
    room_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get room by ID."""
    room = db.query(RoomModel).filter(
        RoomModel.id == room_id,
        RoomModel.organization_id == organization.id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    # Add building_id from floor relationship
    if room.floor:
        room.building_id = room.floor.building_id
    return room


@router.put("/{room_id}", response_model=Room)
async def update_room(
    room_id: int,
    room_update: RoomUpdate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update room."""
    room = db.query(RoomModel).filter(
        RoomModel.id == room_id,
        RoomModel.organization_id == organization.id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # If floor_id is being updated, verify the floor exists and belongs to this organization
    if room_update.floor_id is not None:
        from app.models.floor import Floor as FloorModel
        floor = db.query(FloorModel).join(BuildingModel).filter(
            FloorModel.id == room_update.floor_id,
            BuildingModel.organization_id == organization.id
        ).first()
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")

    # Check room name uniqueness if being updated
    update_dict = room_update.model_dump(exclude_unset=True)
    new_room_name = update_dict.get('room_name', room.room_name)

    if 'room_name' in update_dict:
        existing_room = db.query(RoomModel).filter(
            RoomModel.room_name == new_room_name,
            RoomModel.organization_id == organization.id,
            RoomModel.id != room_id
        ).first()
        if existing_room:
            raise HTTPException(status_code=400, detail=f"Room '{new_room_name}' already exists in this organization")

    # Store old room name for cache invalidation
    old_room_name = room.room_name

    update_data = room_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(room, key, value)

    db.commit()
    db.refresh(room)

    # Add building_id from floor relationship
    if room.floor:
        room.building_id = room.floor.building_id

    # Invalidate cache for both old and new room names
    room_cache.invalidate(old_room_name)
    if room.room_name != old_room_name:
        room_cache.invalidate(room.room_name)

    return room


@router.delete("/{room_id}", status_code=204)
async def delete_room(
    room_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete room."""
    room = db.query(RoomModel).filter(
        RoomModel.id == room_id,
        RoomModel.organization_id == organization.id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Invalidate cache
    room_cache.invalidate(room.room_name)

    db.delete(room)
    db.commit()
    return None
