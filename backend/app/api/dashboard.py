"""
Dashboard statistics endpoint.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.dashboard import DashboardStats
from app.models.user import User
from app.models.building import Building
from app.models.room import Room
from app.models.anchor import Anchor
from app.models.tag import Tag
from app.utils.enums import TagStatus
from app.api.deps import get_db

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Get dashboard statistics.

    Returns:
    - totalUsers: Count of all users
    - totalBuildings: Count of all buildings
    - totalRooms: Count of all rooms
    - totalDevices: Count of all anchors
    - activeTags: Count of tags with status='active'
    - offlineTags: Count of tags with status='offline'
    """
    return DashboardStats(
        totalUsers=db.query(User).count(),
        totalBuildings=db.query(Building).count(),
        totalRooms=db.query(Room).count(),
        totalDevices=db.query(Anchor).count(),
        activeTags=db.query(Tag).filter(Tag.status == TagStatus.active).count(),
        offlineTags=db.query(Tag).filter(Tag.status == TagStatus.offline).count()
    )
