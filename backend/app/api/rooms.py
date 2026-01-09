"""
Room CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.room import Room, RoomCreate, RoomUpdate
from app.schemas.anchor import Anchor
from app.models.room import Room as RoomModel
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.models.organization import Organization
from app.models.anchor import Anchor as AnchorModel
from app.services.room_cache import room_cache
from app.api.deps import get_db, get_current_organization, require_permission
from app.utils.permissions import Permission

router = APIRouter()


@router.get("/", response_model=List[Room], dependencies=[Depends(require_permission(Permission.BUILDING_VIEW))])
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


@router.post("/", response_model=Room, status_code=201, dependencies=[Depends(require_permission(Permission.ROOM_CREATE))])
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
    anchor_ids = room.anchor_ids
    room_data = room.model_dump(exclude={'anchor_id', 'anchor_ids'})

    # Auto-assign organization_id
    room_data['organization_id'] = organization.id

    db_room = RoomModel(**room_data)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)

    # Assign multiple anchors to this room if provided
    from app.models.anchor import Anchor as AnchorModel
    from app.utils.enums import AnchorStatus

    anchors_to_assign = []

    # Support both legacy single anchor_id and new anchor_ids array
    if anchor_ids:
        anchors_to_assign = anchor_ids
    elif anchor_id:
        anchors_to_assign = [anchor_id]

    if anchors_to_assign:
        not_found_anchors = []
        assigned_count = 0

        for anchor_identifier in anchors_to_assign:
            anchor = db.query(AnchorModel).filter(
                AnchorModel.anchor_id == anchor_identifier,
                AnchorModel.organization_id == organization.id
            ).first()

            if anchor:
                # Unassign anchor from any previous room
                if anchor.room_id:
                    pass  # Just reassign
                anchor.room_id = db_room.id
                # Set anchor status to active when assigned to room
                anchor.status = AnchorStatus.active
                assigned_count += 1
            else:
                not_found_anchors.append(anchor_identifier)

        # Commit all anchor assignments
        if assigned_count > 0:
            db.commit()

        # If any anchors were not found, rollback room creation and raise error
        if not_found_anchors:
            db.delete(db_room)
            db.commit()
            raise HTTPException(
                status_code=404,
                detail=f"Anchor(s) not found: {', '.join(not_found_anchors)}"
            )

    # Add building_id from floor relationship
    db_room.building_id = floor.building_id

    # Invalidate room cache for this room name
    room_cache.invalidate(db_room.room_name)

    return db_room


@router.get("/{room_id}", response_model=Room, dependencies=[Depends(require_permission(Permission.BUILDING_VIEW))])
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


@router.get("/{room_id}/anchors", response_model=List[Anchor], dependencies=[Depends(require_permission(Permission.BUILDING_VIEW))])
async def get_room_anchors(
    room_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get all anchors assigned to a specific room."""
    # Verify room exists and belongs to organization
    room = db.query(RoomModel).filter(
        RoomModel.id == room_id,
        RoomModel.organization_id == organization.id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Get all anchors assigned to this room
    anchors = db.query(AnchorModel).filter(
        AnchorModel.room_id == room_id
    ).all()

    return anchors


@router.put("/{room_id}", response_model=Room, dependencies=[Depends(require_permission(Permission.ROOM_EDIT))])
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

    # Handle anchor assignments separately
    from app.models.anchor import Anchor as AnchorModel
    from app.utils.enums import AnchorStatus

    update_data = room_update.model_dump(exclude_unset=True)

    # Check if anchor fields are present in the update (even if None)
    anchor_id_present = 'anchor_id' in update_data
    anchor_ids_present = 'anchor_ids' in update_data

    anchor_id = update_data.pop('anchor_id', None)
    anchor_ids = update_data.pop('anchor_ids', None)

    # Update room fields (excluding anchor assignments)
    for key, value in update_data.items():
        setattr(room, key, value)

    db.commit()

    # Handle anchor assignments after room update
    anchors_to_assign = []

    # Support both legacy single anchor_id and new anchor_ids array
    if anchor_ids_present:
        anchors_to_assign = anchor_ids if anchor_ids else []
    elif anchor_id_present:
        anchors_to_assign = [anchor_id] if anchor_id else []

    # If anchor assignments are being updated (field was present in request)
    if anchor_ids_present or anchor_id_present:
        # First, unassign all current anchors from this room
        current_anchors = db.query(AnchorModel).filter(
            AnchorModel.room_id == room_id
        ).all()

        for anchor in current_anchors:
            anchor.room_id = None
            # Set status to inactive_in_store when unassigned
            anchor.status = AnchorStatus.inactive_in_store

        # Then assign the new anchors
        if anchors_to_assign:
            not_found_anchors = []
            for anchor_identifier in anchors_to_assign:
                anchor = db.query(AnchorModel).filter(
                    AnchorModel.anchor_id == anchor_identifier,
                    AnchorModel.organization_id == organization.id
                ).first()

                if anchor:
                    anchor.room_id = room_id
                    # Set anchor status to active when assigned to room
                    anchor.status = AnchorStatus.active
                else:
                    not_found_anchors.append(anchor_identifier)

            if not_found_anchors:
                db.rollback()
                raise HTTPException(
                    status_code=404,
                    detail=f"Anchor(s) not found: {', '.join(not_found_anchors)}"
                )

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


@router.delete("/{room_id}", status_code=204, dependencies=[Depends(require_permission(Permission.ROOM_DELETE))])
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
