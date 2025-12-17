"""
Live positions endpoint - provides current location for all active tags.
CRITICAL: This is queried frequently by the frontend.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.live_position import LivePositionsResponse, LivePositionItem, LivePositionStats
from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.user import User
from app.models.patient import Patient
from app.models.room import Room
from app.models.floor import Floor
from app.models.building import Building
from app.models.missing_person import MissingPerson
from app.utils.enums import TagStatus
from app.api.deps import get_db

router = APIRouter()


@router.get("/live", response_model=LivePositionsResponse)
async def get_live_positions(db: Session = Depends(get_db)):
    """
    Get live positions for all active and offline tags.

    Returns:
    - positions: List of users and patients with current locations
    - stats: trackedUsers, roomsDetected

    Note: Includes tags with assigned users OR patients and status='active' or 'offline'.
    Missing persons (offline tags with unresolved missing_persons records) appear at TOP.
    """

    # Query active AND offline tags with live locations, users, patients, room hierarchy, AND missing person status
    # Include offline tags to show missing persons who were marked as TAG_LOST
    query = db.query(
        Tag, LiveLocation, User, Patient, Room, Floor, Building, MissingPerson
    ).join(
        LiveLocation, Tag.tag_id == LiveLocation.tag_id
    ).outerjoin(
        User, Tag.assigned_user_id == User.user_id
    ).outerjoin(
        Patient, Tag.assigned_patient_id == Patient.id
    ).outerjoin(
        Room, LiveLocation.room_id == Room.id
    ).outerjoin(
        Floor, Room.floor_id == Floor.id
    ).outerjoin(
        Building, Floor.building_id == Building.id
    ).outerjoin(
        MissingPerson,
        (MissingPerson.tag_id == Tag.tag_id) & (MissingPerson.is_resolved == False)
    ).filter(
        (Tag.status == TagStatus.active) | (Tag.status == TagStatus.offline)
    ).all()

    positions = []
    unique_rooms = set()

    for tag, live_loc, user, patient, room, floor, building, missing_record in query:
        # Include tags assigned to either user OR patient
        person_id = None
        person_name = None

        if user:
            person_id = user.user_id
            person_name = user.name
        elif patient:
            person_id = patient.patient_id
            person_name = patient.name
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

        # Check if person is missing (has unresolved missing_persons record)
        is_missing = missing_record is not None
        missing_duration = None
        last_seen_formatted = None

        if is_missing:
            current_time = datetime.utcnow()
            missing_duration = int((current_time - missing_record.last_seen_at).total_seconds())
            last_seen_formatted = missing_record.last_seen_at.strftime("%b %d, %Y, %I:%M:%S %p")

        positions.append(LivePositionItem(
            id=person_id,
            userName=person_name,
            handbandSerial=tag.tag_id,
            lastSeenRoom=room.room_name if room else None,
            building=building_name,
            floor=floor_number,
            fullLocation=full_location,
            lastRSSI=None,  # Backend doesn't store RSSI
            updatedAt=live_loc.updated_at.strftime("%b %d, %Y, %I:%M:%S %p"),
            isMissing=is_missing,
            missingDuration=missing_duration,
            lastSeenAt=last_seen_formatted
        ))
        if room:
            unique_rooms.add(room.room_name)

    # CRITICAL: Sort positions - missing persons at TOP of table
    positions.sort(key=lambda x: (not x.isMissing, x.userName))

    stats = LivePositionStats(
        trackedUsers=len(positions),
        roomsDetected=len(unique_rooms)
    )

    return LivePositionsResponse(positions=positions, stats=stats)
