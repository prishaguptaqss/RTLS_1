"""
Pydantic schemas for location events.
CRITICAL: These schemas define the event format from the Python MQTT service.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.utils.enums import EventType


class LocationEvent(BaseModel):
    """
    Schema for location events received from Python MQTT service.

    Event types:
    - LOCATION_CHANGE: Tag moved from one room to another
    - INITIAL_LOCATION: First time seeing this tag
    - TAG_LOST: Tag not seen for X seconds
    """
    event_type: EventType
    tag_id: str
    timestamp: int  # Unix timestamp

    # Optional fields depending on event type
    from_room: Optional[str] = None  # For LOCATION_CHANGE
    to_room: Optional[str] = None    # For LOCATION_CHANGE, INITIAL_LOCATION
    last_room: Optional[str] = None  # For TAG_LOST


class LocationEventResponse(BaseModel):
    """Response schema for location event ingestion."""
    status: str
    message: str
    tag_id: str


class LocationHistoryItem(BaseModel):
    """Schema for a single location history record."""
    id: int
    room_name: str
    building_name: str
    floor_number: int
    entered_at: datetime
    exited_at: Optional[datetime]
    duration_minutes: Optional[int]


class LocationHistoryResponse(BaseModel):
    """Schema for user location history response."""
    user_id: str
    user_name: str
    history: List[LocationHistoryItem]
    total_records: int
