"""
Pydantic schemas for dashboard statistics.
"""
from pydantic import BaseModel


class DashboardStats(BaseModel):
    """Dashboard statistics schema."""
    totalUsers: int
    totalBuildings: int
    totalRooms: int
    totalDevices: int  # Total anchors
    activeTags: int    # Tags with status='active'
    offlineTags: int   # Tags with status='offline'
