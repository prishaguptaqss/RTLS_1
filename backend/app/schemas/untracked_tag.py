"""
Pydantic schemas for untracked tags.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UntrackedTagItem(BaseModel):
    """Schema for a single untracked tag record."""
    id: int
    tag_id: str
    user_id: Optional[str]
    user_name: Optional[str]
    last_room_name: Optional[str]
    building: Optional[str]
    floor: Optional[int]
    full_location: Optional[str]
    last_seen_at: str  # Formatted datetime string
    marked_untracked_at: str  # Formatted datetime string
    duration_lost_minutes: Optional[int]  # How long the tag has been missing


class UntrackedTagsResponse(BaseModel):
    """Schema for untracked tags response."""
    untracked_tags: List[UntrackedTagItem]
    total: int
