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
from app.api.deps import get_db, get_current_organization, require_permission
from app.models.organization import Organization
from app.utils.permissions import Permission

router = APIRouter()


@router.get("/", response_model=List[Entity], dependencies=[Depends(require_permission(Permission.ENTITY_VIEW))])
async def list_entities(
    type: Optional[str] = Query(None, description="Filter by type: person or material"),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all entities within the organization with optional type filter."""
    query = db.query(EntityModel).filter(EntityModel.organization_id == organization.id)

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
                    # Build location path safely with null checks
                    floor = db.query(FloorModel).filter(FloorModel.id == room.floor_id).first() if room.floor_id else None
                    building = db.query(BuildingModel).filter(BuildingModel.id == floor.building_id).first() if floor and floor.building_id else None

                    # Construct location string based on available data
                    if building and floor:
                        entity.current_location = f"{building.name} > Floor {floor.floor_number} > {room.room_name}"
                    elif floor:
                        entity.current_location = f"Floor {floor.floor_number} > {room.room_name}"
                    else:
                        entity.current_location = room.room_name
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


@router.post("/", response_model=Entity, status_code=201, dependencies=[Depends(require_permission(Permission.ENTITY_ADMIT))])
async def create_entity(
    entity: EntityCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Create a new entity with optional tag assignment."""
    # Check if entity_id already exists within this organization
    existing_entity = db.query(EntityModel).filter(
        EntityModel.entity_id == entity.entity_id,
        EntityModel.organization_id == organization.id
    ).first()
    if existing_entity:
        raise HTTPException(status_code=400, detail=f"Entity with entity_id '{entity.entity_id}' already exists in this organization")

    # If tag is being assigned, verify it exists within the organization and is available
    if entity.assigned_tag_id:
        tag = db.query(TagModel).filter(
            TagModel.tag_id == entity.assigned_tag_id,
            TagModel.organization_id == organization.id
        ).first()
        if not tag:
            raise HTTPException(status_code=404, detail=f"Tag '{entity.assigned_tag_id}' not found in this organization")
        if tag.assigned_user_id or tag.assigned_entity_id:
            raise HTTPException(status_code=400, detail=f"Tag '{entity.assigned_tag_id}' is already assigned")

    # Create entity (exclude assigned_tag_id from model creation)
    entity_data = entity.model_dump(exclude={'assigned_tag_id'})
    # Force type to patient
    from app.utils.enums import EntityType
    entity_data['type'] = EntityType.patient
    db_entity = EntityModel(**entity_data, organization_id=organization.id)
    db.add(db_entity)
    db.commit()
    db.refresh(db_entity)

    # Assign tag if provided
    if entity.assigned_tag_id:
        from datetime import datetime, timezone
        from app.models.entity_tag_assignment import EntityTagAssignment

        tag.assigned_entity_id = db_entity.id

        # Create assignment record
        assignment = EntityTagAssignment(
            entity_id=db_entity.id,
            tag_id=tag.tag_id,
            assigned_at=datetime.now(timezone.utc),
            unassigned_at=None
        )
        db.add(assignment)

        db.commit()
        db.refresh(tag)
        db_entity.assigned_tag_id = tag.tag_id
    else:
        db_entity.assigned_tag_id = None

    return db_entity


@router.get("/{entity_id}", response_model=Entity)
async def get_entity(
    entity_id: str,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get entity by ID within the organization."""
    entity = db.query(EntityModel).filter(
        EntityModel.entity_id == entity_id,
        EntityModel.organization_id == organization.id
    ).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found in this organization")

    # Add assigned tag info
    tag = db.query(TagModel).filter(TagModel.assigned_entity_id == entity.id).first()
    entity.assigned_tag_id = tag.tag_id if tag else None

    return entity


@router.put("/{entity_id}", response_model=Entity, dependencies=[Depends(require_permission(Permission.ENTITY_EDIT))])
async def update_entity(
    entity_id: str,
    entity_update: EntityUpdate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update entity information and tag assignment."""
    entity = db.query(EntityModel).filter(
        EntityModel.entity_id == entity_id,
        EntityModel.organization_id == organization.id
    ).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found in this organization")

    # Handle tag assignment changes
    if 'assigned_tag_id' in entity_update.model_dump(exclude_unset=True):
        new_tag_id = entity_update.assigned_tag_id
        print(f"[DEBUG] Updating tag assignment for entity {entity_id}: new_tag_id={new_tag_id}")

        # Get current tag if any
        current_tag = db.query(TagModel).filter(TagModel.assigned_entity_id == entity.id).first()
        print(f"[DEBUG] Current tag: {current_tag.tag_id if current_tag else None}")

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
            elif new_tag.assigned_user_id or new_tag.assigned_entity_id:
                raise HTTPException(status_code=400, detail=f"Tag '{new_tag_id}' is already assigned")
            else:
                from datetime import datetime, timezone
                from app.models.entity_tag_assignment import EntityTagAssignment
                from app.models.location_history import LocationHistory
                from app.models.live_location import LiveLocation

                reassignment_time = datetime.now(timezone.utc)

                # Unassign current tag if exists
                if current_tag:
                    # Close the current assignment record
                    current_assignment = db.query(EntityTagAssignment).filter(
                        EntityTagAssignment.entity_id == entity.id,
                        EntityTagAssignment.tag_id == current_tag.tag_id,
                        EntityTagAssignment.unassigned_at.is_(None)
                    ).first()
                    if current_assignment:
                        current_assignment.unassigned_at = reassignment_time

                    # Close any open location history entry for the old tag
                    open_location = db.query(LocationHistory).filter(
                        LocationHistory.tag_id == current_tag.tag_id,
                        LocationHistory.exited_at.is_(None)
                    ).first()
                    if open_location:
                        open_location.exited_at = reassignment_time

                    # Remove old tag from live location
                    live_location = db.query(LiveLocation).filter(
                        LiveLocation.tag_id == current_tag.tag_id
                    ).first()
                    if live_location:
                        db.delete(live_location)

                    current_tag.assigned_entity_id = None

                # Create new assignment record
                new_assignment = EntityTagAssignment(
                    entity_id=entity.id,
                    tag_id=new_tag.tag_id,
                    assigned_at=reassignment_time,
                    unassigned_at=None
                )
                db.add(new_assignment)

                # Assign new tag
                new_tag.assigned_entity_id = entity.id
        else:
            # Unassigning tag (set to None/null)
            print(f"[DEBUG] Unassigning tag from entity {entity_id}")
            if current_tag:
                from datetime import datetime, timezone
                from app.models.entity_tag_assignment import EntityTagAssignment
                from app.models.location_history import LocationHistory
                from app.models.live_location import LiveLocation

                unassignment_time = datetime.now(timezone.utc)
                print(f"[DEBUG] Found current tag {current_tag.tag_id} to unassign")

                # Close the current assignment record
                current_assignment = db.query(EntityTagAssignment).filter(
                    EntityTagAssignment.entity_id == entity.id,
                    EntityTagAssignment.tag_id == current_tag.tag_id,
                    EntityTagAssignment.unassigned_at.is_(None)
                ).first()
                if current_assignment:
                    current_assignment.unassigned_at = unassignment_time
                    print(f"[DEBUG] Closed assignment record")

                # Close any open location history entry (set exited_at)
                open_location = db.query(LocationHistory).filter(
                    LocationHistory.tag_id == current_tag.tag_id,
                    LocationHistory.exited_at.is_(None)
                ).first()
                if open_location:
                    open_location.exited_at = unassignment_time
                    print(f"[DEBUG] Closed location history")

                # Remove from live location
                live_location = db.query(LiveLocation).filter(
                    LiveLocation.tag_id == current_tag.tag_id
                ).first()
                if live_location:
                    db.delete(live_location)
                    print(f"[DEBUG] Removed from live location")

                current_tag.assigned_entity_id = None
                print(f"[DEBUG] Set tag {current_tag.tag_id} assigned_entity_id to None")
            else:
                print(f"[DEBUG] No current tag found to unassign")

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


@router.delete("/{entity_id}", status_code=204, dependencies=[Depends(require_permission(Permission.ENTITY_DELETE))])
async def delete_entity(
    entity_id: str,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete entity within the organization."""
    entity = db.query(EntityModel).filter(
        EntityModel.entity_id == entity_id,
        EntityModel.organization_id == organization.id
    ).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found in this organization")

    db.delete(entity)
    db.commit()
    return None


@router.get("/{entity_id}/location-history", response_model=LocationHistoryResponse)
async def get_entity_location_history(
    entity_id: str,
    recent: bool = Query(False, description="If true, return only recent history based on organization settings"),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    Get location history for a specific entity within the organization.

    Returns location history records for tags that were assigned to this entity
    during the time periods they were assigned, with full building hierarchy information.

    NEW BEHAVIOR: Uses temporal assignment records to filter history by assignment periods.
    Entity keeps ALL its history even after tag unassignment.

    If 'recent' parameter is True, only returns history from the last N days
    (where N is configured in organization settings as history_retention_days).
    """
    import sqlalchemy as sa
    from datetime import datetime, timedelta, timezone
    from app.models.entity_tag_assignment import EntityTagAssignment
    from app.models.organization_settings import OrganizationSettings

    # First, verify entity exists within this organization
    entity = db.query(EntityModel).filter(
        EntityModel.entity_id == entity_id,
        EntityModel.organization_id == organization.id
    ).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found in this organization")

    # Get organization settings for history retention
    org_settings = db.query(OrganizationSettings).filter(
        OrganizationSettings.organization_id == organization.id
    ).first()
    history_retention_days = org_settings.history_retention_days if org_settings else 1

    # Query location history with temporal join through assignment periods
    # Join: LocationHistory -> EntityTagAssignment (temporal) -> Room -> Floor -> Building
    # Logic: Include location records where:
    #   - The tag was assigned to this entity
    #   - The location timestamp falls within the assignment period
    query = (
        db.query(
            LocationHistoryModel.id,
            RoomModel.room_name,
            BuildingModel.name.label("building_name"),
            FloorModel.floor_number,
            LocationHistoryModel.entered_at,
            LocationHistoryModel.exited_at
        )
        .join(
            EntityTagAssignment,
            LocationHistoryModel.tag_id == EntityTagAssignment.tag_id
        )
        .outerjoin(RoomModel, LocationHistoryModel.room_id == RoomModel.id)
        .outerjoin(FloorModel, RoomModel.floor_id == FloorModel.id)
        .outerjoin(BuildingModel, FloorModel.building_id == BuildingModel.id)
        .filter(
            EntityTagAssignment.entity_id == entity.id,
            # CRITICAL: Temporal filter - location must fall within assignment period
            LocationHistoryModel.entered_at >= EntityTagAssignment.assigned_at,
            # If unassigned_at is NULL (still assigned), include all future locations
            # If unassigned_at is set, only include locations before unassignment
            sa.or_(
                EntityTagAssignment.unassigned_at.is_(None),
                LocationHistoryModel.entered_at < EntityTagAssignment.unassigned_at
            )
        )
    )

    # If recent flag is True, filter by retention days
    if recent:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=history_retention_days)
        query = query.filter(LocationHistoryModel.entered_at >= cutoff_date)

    history_records = query.order_by(LocationHistoryModel.entered_at.desc()).all()

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
