"""
Building CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.building import Building, BuildingCreate, BuildingUpdate
from app.models.building import Building as BuildingModel
from app.api.deps import get_db

router = APIRouter()


@router.get("/", response_model=List[Building])
async def list_buildings(db: Session = Depends(get_db)):
    """List all buildings."""
    return db.query(BuildingModel).all()


@router.post("/", response_model=Building, status_code=201)
async def create_building(building: BuildingCreate, db: Session = Depends(get_db)):
    """Create a new building."""
    db_building = BuildingModel(**building.model_dump())
    db.add(db_building)
    db.commit()
    db.refresh(db_building)
    return db_building


@router.get("/{building_id}", response_model=Building)
async def get_building(building_id: int, db: Session = Depends(get_db)):
    """Get building by ID."""
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.put("/{building_id}", response_model=Building)
async def update_building(building_id: int, building_update: BuildingUpdate, db: Session = Depends(get_db)):
    """Update building."""
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    update_data = building_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(building, key, value)

    db.commit()
    db.refresh(building)
    return building


@router.delete("/{building_id}", status_code=204)
async def delete_building(building_id: int, db: Session = Depends(get_db)):
    """Delete building."""
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    db.delete(building)
    db.commit()
    return None
