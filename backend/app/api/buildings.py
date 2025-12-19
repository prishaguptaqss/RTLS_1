"""
Building CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.building import Building, BuildingCreate, BuildingUpdate
from app.models.building import Building as BuildingModel
from app.models.organization import Organization
from app.api.deps import get_db, get_current_organization

router = APIRouter()


@router.get("/", response_model=List[Building])
async def list_buildings(
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List all buildings within the organization."""
    return db.query(BuildingModel).filter(BuildingModel.organization_id == organization.id).all()


@router.post("/", response_model=Building, status_code=201)
async def create_building(
    building: BuildingCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Create a new building within the organization."""
    # Auto-assign organization from context
    db_building = BuildingModel(**building.model_dump(), organization_id=organization.id)
    db.add(db_building)
    db.commit()
    db.refresh(db_building)
    return db_building


@router.get("/{building_id}", response_model=Building)
async def get_building(
    building_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get building by ID."""
    building = db.query(BuildingModel).filter(
        BuildingModel.id == building_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.put("/{building_id}", response_model=Building)
async def update_building(
    building_id: int,
    building_update: BuildingUpdate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update building."""
    building = db.query(BuildingModel).filter(
        BuildingModel.id == building_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    update_data = building_update.model_dump(exclude_unset=True)
    # Prevent changing organization_id
    update_data.pop('organization_id', None)

    for key, value in update_data.items():
        setattr(building, key, value)

    db.commit()
    db.refresh(building)
    return building


@router.delete("/{building_id}", status_code=204)
async def delete_building(
    building_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete building."""
    building = db.query(BuildingModel).filter(
        BuildingModel.id == building_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    db.delete(building)
    db.commit()
    return None
