"""
Pydantic schemas for live position tracking.
CRITICAL: Field names must match frontend expectations exactly (camelCase).
"""
from pydantic import BaseModel
from typing import List, Optional


class LivePositionItem(BaseModel):
    """
    Individual live position item.
    CRITICAL: Uses camelCase to match frontend schema.
    """
    id: int  # User ID (not tag ID)
    userName: str
    handbandSerial: str  # Tag ID (BLE MAC address)
    lastSeenRoom: Optional[str]
    lastRSSI: Optional[int] = None  # Backend doesn't store RSSI, always None
    updatedAt: str  # Formatted datetime string


class LivePositionStats(BaseModel):
    """Statistics for live position tracking."""
    trackedUsers: int
    roomsDetected: int


class LivePositionsResponse(BaseModel):
    """Complete response for GET /api/positions/live endpoint."""
    positions: List[LivePositionItem]
    stats: LivePositionStats
