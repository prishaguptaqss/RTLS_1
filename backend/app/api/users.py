"""
User CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.user import User, UserCreate, UserUpdate
from app.schemas.location import LocationHistoryResponse, LocationHistoryItem
from app.models.user import User as UserModel
from app.models.tag import Tag as TagModel
from app.models.location_history import LocationHistory as LocationHistoryModel
from app.models.room import Room as RoomModel
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.api.deps import get_db

router = APIRouter()


@router.get("/", response_model=List[User])
async def list_users(db: Session = Depends(get_db)):
    """List all users."""
    return db.query(UserModel).all()


@router.post("/", response_model=User, status_code=201)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    # Check if user_id already exists
    existing_user = db.query(UserModel).filter(UserModel.user_id == user.user_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail=f"User with user_id '{user.user_id}' already exists")

    db_user = UserModel(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user by ID."""
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Update user."""
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: str, db: Session = Depends(get_db)):
    """Delete user."""
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return None


@router.get("/{user_id}/location-history", response_model=LocationHistoryResponse)
async def get_user_location_history(user_id: str, db: Session = Depends(get_db)):
    """
    Get location history for a specific user.

    Returns all location history records for tags assigned to this user,
    with full building hierarchy information (Building > Floor > Room).
    """
    # First, verify user exists
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Query location history with joins to get full building hierarchy
    # Join: LocationHistory -> Tag -> Room -> Floor -> Building
    history_records = (
        db.query(
            LocationHistoryModel.id,
            RoomModel.room_name,
            BuildingModel.name.label("building_name"),
            FloorModel.floor_number,
            LocationHistoryModel.entered_at,
            LocationHistoryModel.exited_at
        )
        .join(TagModel, LocationHistoryModel.tag_id == TagModel.tag_id)
        .outerjoin(RoomModel, LocationHistoryModel.room_id == RoomModel.id)
        .outerjoin(FloorModel, RoomModel.floor_id == FloorModel.id)
        .outerjoin(BuildingModel, FloorModel.building_id == BuildingModel.id)
        .filter(TagModel.assigned_user_id == user_id)
        .order_by(LocationHistoryModel.entered_at.desc())
        .all()
    )

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
        user_id=user.user_id,
        user_name=user.name,
        history=history_items,
        total_records=len(history_items)
    )
