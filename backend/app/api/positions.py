"""
Live positions endpoint - provides current location for all active tags.
CRITICAL: This is queried frequently by the frontend.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.schemas.live_position import LivePositionsResponse, LivePositionItem, LivePositionStats
from app.schemas.untracked_tag import UntrackedTagsResponse, UntrackedTagItem
from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.user import User
from app.models.room import Room
from app.models.floor import Floor
from app.models.building import Building
from app.models.untracked_tag import UntrackedTag
from app.utils.enums import TagStatus
from app.api.deps import get_db

router = APIRouter()


@router.get("/live", response_model=LivePositionsResponse)
async def get_live_positions(db: Session = Depends(get_db)):
    """
    Get live positions for all active tags.

    Returns:
    - positions: List of users and entities with current locations
    - stats: trackedUsers, roomsDetected

    Note: Includes tags with assigned users OR entities and status='active'.
    """
    # Import Entity model
    from app.models.entity import Entity

    # Query active tags with live locations, users, entities, and room hierarchy
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
        Tag.status == TagStatus.active
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


@router.get("/untracked", response_model=UntrackedTagsResponse)
async def get_untracked_users(db: Session = Depends(get_db)):
    """
    Get all untracked/missing tags.

    Returns tags that have been marked as lost/offline with:
    - Last known position
    - Last seen timestamp
    - User information (if assigned)
    - Duration since marked as lost

    Ordered by most recently marked as untracked first.
    """
    # Query untracked tags with room, floor, and building information
    query = db.query(
        UntrackedTag, Room, Floor, Building
    ).outerjoin(
        Room, UntrackedTag.last_room_id == Room.id
    ).outerjoin(
        Floor, Room.floor_id == Floor.id
    ).outerjoin(
        Building, Floor.building_id == Building.id
    ).order_by(
        UntrackedTag.marked_untracked_at.desc()
    ).all()

    untracked_tags = []

    for untracked, room, floor, building in query:
        # Build full location string
        full_location = None
        building_name = None
        floor_number = None

        if room and floor and building:
            full_location = f"{building.name} > Floor {floor.floor_number} > {room.room_name}"
            building_name = building.name
            floor_number = floor.floor_number

        # Calculate duration lost in minutes
        now = datetime.now(timezone.utc)
        duration_lost = now - untracked.marked_untracked_at
        duration_lost_minutes = int(duration_lost.total_seconds() / 60)

        untracked_tags.append(UntrackedTagItem(
            id=untracked.id,
            tag_id=untracked.tag_id,
            user_id=untracked.user_id,
            user_name=untracked.user_name or "Unknown",
            last_room_name=untracked.last_room_name,
            building=building_name,
            floor=floor_number,
            full_location=full_location,
            last_seen_at=untracked.last_seen_at.strftime("%b %d, %Y, %I:%M:%S %p"),
            marked_untracked_at=untracked.marked_untracked_at.strftime("%b %d, %Y, %I:%M:%S %p"),
            duration_lost_minutes=duration_lost_minutes
        ))

    return UntrackedTagsResponse(
        untracked_tags=untracked_tags,
        total=len(untracked_tags)
    )
