"""
Live positions endpoint - provides current location for all active tags.
CRITICAL: This is queried frequently by the frontend.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.live_position import LivePositionsResponse, LivePositionItem, LivePositionStats
from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.user import User
from app.models.room import Room
from app.models.floor import Floor
from app.models.building import Building
from app.models.organization import Organization
from app.utils.enums import TagStatus
from app.api.deps import get_db, get_current_organization

router = APIRouter()


@router.get("/live", response_model=LivePositionsResponse)
async def get_live_positions(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """
    Get live positions for all active tags within the current organization.

    Returns:
    - positions: List of users and entities with current locations
    - stats: trackedUsers, roomsDetected

    Note: Includes tags with assigned users OR entities and status='active'.
    CRITICAL: Only returns data for the current organization.
    """
    # Import Entity model
    from app.models.entity import Entity

    # Query active tags with live locations, users, entities, and room hierarchy
    # CRITICAL: Filter by organization_id to ensure data isolation
    query = db.query(
        Tag, LiveLocation, User, Entity, Room, Floor, Building
    ).join(
        LiveLocation, Tag.tag_id == LiveLocation.tag_id
    ).outerjoin(
        User, Tag.assigned_user_id == User.user_id
    ).outerjoin(
        Entity, Tag.assigned_entity_id == Entity.id
    ).outerjoin(
        Room, LiveLocation.room_id == Room.id
    ).outerjoin(
        Floor, Room.floor_id == Floor.id
    ).outerjoin(
        Building, Floor.building_id == Building.id
    ).filter(
        Tag.status == TagStatus.active,
        Tag.organization_id == organization.id  # CRITICAL: Organization isolation
    ).all()

    positions = []
    unique_rooms = set()

    for tag, live_loc, user, entity, room, floor, building in query:
        # Include tags assigned to either user OR entity
        person_id = None
        person_name = None

        if user:
            person_id = user.user_id
            person_name = user.name
        elif entity:
            person_id = entity.entity_id
            person_name = entity.name
        else:
            # Skip unassigned tags
            continue

        # Build fullLocation string: "Building > Floor N > Room"
        full_location = None
        building_name = None
        floor_number = None

        if room and floor and building:
            full_location = f"{building.name} > Floor {floor.floor_number} > {room.room_name}"
            building_name = building.name
            floor_number = floor.floor_number

        positions.append(LivePositionItem(
            id=person_id,
            userName=person_name,
            handbandSerial=tag.tag_id,
            lastSeenRoom=room.room_name if room else None,
            building=building_name,
            floor=floor_number,
            fullLocation=full_location,
            lastRSSI=None,  # Backend doesn't store RSSI
            updatedAt=live_loc.updated_at.strftime("%b %d, %Y, %I:%M:%S %p")
        ))
        if room:
            unique_rooms.add(room.room_name)

    stats = LivePositionStats(
        trackedUsers=len(positions),
        roomsDetected=len(unique_rooms)
    )

    return LivePositionsResponse(positions=positions, stats=stats)
