"""
Floor CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.floor import Floor, FloorCreate, FloorUpdate
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.models.organization import Organization
from app.api.deps import get_db, get_current_organization

router = APIRouter()


@router.get("/", response_model=List[Floor])
async def list_floors(
    organization: Organization = Depends(get_current_organization),
    building_id: Optional[int] = Query(None, description="Filter by building ID"),
    db: Session = Depends(get_db)
):
    """List all floors within the organization, optionally filtered by building."""
    # Join with buildings to filter by organization
    query = db.query(FloorModel).join(BuildingModel).filter(BuildingModel.organization_id == organization.id)

    if building_id:
        query = query.filter(FloorModel.building_id == building_id)

    return query.all()


@router.post("/", response_model=Floor, status_code=201)
async def create_floor(floor: FloorCreate, db: Session = Depends(get_db)):
    """Create a new floor."""
    db_floor = FloorModel(**floor.model_dump())
    db.add(db_floor)
    db.commit()
    db.refresh(db_floor)
    return db_floor


@router.get("/{floor_id}", response_model=Floor)
async def get_floor(
    floor_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get floor by ID."""
    floor = db.query(FloorModel).join(BuildingModel).filter(
        FloorModel.id == floor_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    return floor


@router.put("/{floor_id}", response_model=Floor)
async def update_floor(
    floor_id: int,
    floor_update: FloorUpdate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update floor."""
    floor = db.query(FloorModel).join(BuildingModel).filter(
        FloorModel.id == floor_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    update_data = floor_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(floor, key, value)

    db.commit()
    db.refresh(floor)
    return floor


@router.delete("/{floor_id}", status_code=204)
async def delete_floor(
    floor_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete floor."""
    floor = db.query(FloorModel).join(BuildingModel).filter(
        FloorModel.id == floor_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    db.delete(floor)
    db.commit()
    return None
