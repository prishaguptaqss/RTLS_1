"""
Event ingestion endpoint - receives location events from Python MQTT service.
CRITICAL: This is the main entry point for all location data.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.location import LocationEvent, LocationEventResponse
from app.services.location_service import location_service
from app.api.deps import get_db

router = APIRouter()


@router.post("/location-event", response_model=LocationEventResponse)
async def ingest_location_event(
    event: LocationEvent,
    db: Session = Depends(get_db)
):
    """
    Ingest location event from Python MQTT service.

    Event types:
    - LOCATION_CHANGE: Tag moved to new room
    - INITIAL_LOCATION: First time seeing tag
    - TAG_LOST: Tag not seen for X seconds

    Args:
        event: Location event data
        db: Database session

    Returns:
        LocationEventResponse with status and message

    Raises:
        HTTPException: If event processing fails
    """
    try:
        result = await location_service.process_event(db, event)
        return LocationEventResponse(
            status=result["status"],
            message=result["message"],
            tag_id=event.tag_id
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
