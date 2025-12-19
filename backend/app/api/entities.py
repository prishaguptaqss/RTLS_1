"""
Entity CRUD endpoints - replaces patients.py for generalized tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.entity import Entity, EntityCreate, EntityUpdate
from app.schemas.location import LocationHistoryResponse, LocationHistoryItem
from app.models.entity import Entity as EntityModel
from app.models.tag import Tag as TagModel
from app.models.location_history import LocationHistory as LocationHistoryModel
from app.models.live_location import LiveLocation as LiveLocationModel
from app.models.room import Room as RoomModel
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.utils.enums import TagStatus
from app.api.deps import get_db

router = APIRouter()


@router.get("/", response_model=List[Entity])
async def list_entities(
    type: Optional[str] = Query(None, description="Filter by type: person or material"),
    db: Session = Depends(get_db)
):
    """List all entities with optional type filter."""
    query = db.query(EntityModel)

    if type:
        query = query.filter(EntityModel.type == type)

    entities = query.all()

    # Add assigned_tag_id and tracking info to response
    for entity in entities:
        tag = db.query(TagModel).filter(TagModel.assigned_entity_id == entity.id).first()

        if tag:
            entity.assigned_tag_id = tag.tag_id
            entity.tag_name = tag.name  # Add tag name
            entity.tracking_status = "tracked" if tag.status == TagStatus.active else "untracked"
            entity.last_seen = tag.last_seen

            # Get current location from LiveLocation
            live_loc = db.query(LiveLocationModel).filter(LiveLocationModel.tag_id == tag.tag_id).first()
            if live_loc and live_loc.room_id:
                room = db.query(RoomModel).filter(RoomModel.id == live_loc.room_id).first()
                if room:
                    floor = db.query(FloorModel).filter(FloorModel.id == room.floor_id).first()
                    building = db.query(BuildingModel).filter(BuildingModel.id == floor.building_id).first()
                    entity.current_location = f"{building.name} > Floor {floor.floor_number} > {room.room_name}"
                else:
                    entity.current_location = None
            else:
                entity.current_location = None
        else:
            entity.assigned_tag_id = None
            entity.tag_name = None
            entity.tracking_status = None
            entity.current_location = None
            entity.last_seen = None

    return entities


@router.post("/", response_model=Entity, status_code=201)
async def create_entity(entity: EntityCreate, db: Session = Depends(get_db)):
    """Create a new entity with optional tag assignment."""
    # Check if entity_id already exists
    existing_entity = db.query(EntityModel).filter(EntityModel.entity_id == entity.entity_id).first()
    if existing_entity:
        raise HTTPException(status_code=400, detail=f"Entity with entity_id '{entity.entity_id}' already exists")

    # If tag is being assigned, verify it exists and is available
    if entity.assigned_tag_id:
        tag = db.query(TagModel).filter(TagModel.tag_id == entity.assigned_tag_id).first()
        if not tag:
            raise HTTPException(status_code=404, detail=f"Tag '{entity.assigned_tag_id}' not found")
        if tag.assigned_user_id or tag.assigned_entity_id:
            raise HTTPException(status_code=400, detail=f"Tag '{entity.assigned_tag_id}' is already assigned")

    # Create entity (exclude assigned_tag_id from model creation)
    entity_data = entity.model_dump(exclude={'assigned_tag_id'})
    db_entity = EntityModel(**entity_data)
    db.add(db_entity)
    db.commit()
    db.refresh(db_entity)

    # Assign tag if provided
    if entity.assigned_tag_id:
        tag.assigned_entity_id = db_entity.id
        db.commit()
        db.refresh(tag)
        db_entity.assigned_tag_id = tag.tag_id
    else:
        db_entity.assigned_tag_id = None

    return db_entity


@router.get("/{entity_id}", response_model=Entity)
async def get_entity(entity_id: str, db: Session = Depends(get_db)):
    """Get entity by ID."""
    entity = db.query(EntityModel).filter(EntityModel.entity_id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Add assigned tag info
    tag = db.query(TagModel).filter(TagModel.assigned_entity_id == entity.id).first()
    entity.assigned_tag_id = tag.tag_id if tag else None

    return entity


@router.put("/{entity_id}", response_model=Entity)
async def update_entity(entity_id: str, entity_update: EntityUpdate, db: Session = Depends(get_db)):
    """Update entity information and tag assignment."""
    entity = db.query(EntityModel).filter(EntityModel.entity_id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Handle tag assignment changes
    if 'assigned_tag_id' in entity_update.model_dump(exclude_unset=True):
        new_tag_id = entity_update.assigned_tag_id

        # Get current tag if any
        current_tag = db.query(TagModel).filter(TagModel.assigned_entity_id == entity.id).first()

        # If changing to a different tag (or assigning for first time)
        if new_tag_id:
            # Verify new tag exists and is available
            new_tag = db.query(TagModel).filter(TagModel.tag_id == new_tag_id).first()
            if not new_tag:
                raise HTTPException(status_code=404, detail=f"Tag '{new_tag_id}' not found")

            # Check if tag is available (unless it's the current tag)
            if current_tag and current_tag.tag_id == new_tag_id:
                pass  # Same tag, no change needed
            elif new_tag.assigned_user_id or new_tag.assigned_entity_id:
                raise HTTPException(status_code=400, detail=f"Tag '{new_tag_id}' is already assigned")
            else:
                # Unassign current tag if exists
                if current_tag:
                    current_tag.assigned_entity_id = None
                # Assign new tag
                new_tag.assigned_entity_id = entity.id
        else:
            # Unassigning tag (set to None/null)
            if current_tag:
                current_tag.assigned_entity_id = None

    # Update other entity fields
    update_data = entity_update.model_dump(exclude_unset=True, exclude={'assigned_tag_id'})
    for key, value in update_data.items():
        setattr(entity, key, value)

    db.commit()
    db.refresh(entity)

    # Add current tag info to response
    tag = db.query(TagModel).filter(TagModel.assigned_entity_id == entity.id).first()
    entity.assigned_tag_id = tag.tag_id if tag else None

    return entity


@router.delete("/{entity_id}", status_code=204)
async def delete_entity(entity_id: str, db: Session = Depends(get_db)):
    """Delete entity."""
    entity = db.query(EntityModel).filter(EntityModel.entity_id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    db.delete(entity)
    db.commit()
    return None


@router.get("/{entity_id}/location-history", response_model=LocationHistoryResponse)
async def get_entity_location_history(entity_id: str, db: Session = Depends(get_db)):
    """
    Get location history for a specific entity.

    Returns all location history records for tags assigned to this entity,
    with full building hierarchy information (Building > Floor > Room).
    """
    # First, verify entity exists
    entity = db.query(EntityModel).filter(EntityModel.entity_id == entity_id).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

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
        .filter(TagModel.assigned_entity_id == entity.id)
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
        user_id=entity.entity_id,
        user_name=entity.name or entity.entity_id,
        history=history_items,
        total_records=len(history_items)
    )
