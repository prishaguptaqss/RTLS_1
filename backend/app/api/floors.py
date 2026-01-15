"""
Floor CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from pathlib import Path

from app.schemas.floor import Floor, FloorCreate, FloorUpdate
from app.models.floor import Floor as FloorModel
from app.models.building import Building as BuildingModel
from app.models.organization import Organization
from app.api.deps import get_db, get_current_organization, require_permission
from app.utils.permissions import Permission

router = APIRouter()

# Configuration for floor plan uploads
FLOOR_PLAN_UPLOAD_DIR = Path("uploads/floor_plans")
FLOOR_PLAN_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif"}  # Only image files


@router.get("/", response_model=List[Floor], dependencies=[Depends(require_permission(Permission.BUILDING_VIEW))])
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


@router.post("/", response_model=Floor, status_code=201, dependencies=[Depends(require_permission(Permission.FLOOR_CREATE))])
async def create_floor(floor: FloorCreate, db: Session = Depends(get_db)):
    """Create a new floor."""
    db_floor = FloorModel(**floor.model_dump())
    db.add(db_floor)
    db.commit()
    db.refresh(db_floor)
    return db_floor


@router.get("/{floor_id}", response_model=Floor, dependencies=[Depends(require_permission(Permission.BUILDING_VIEW))])
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


@router.put("/{floor_id}", response_model=Floor, dependencies=[Depends(require_permission(Permission.FLOOR_EDIT))])
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


@router.delete("/{floor_id}", status_code=204, dependencies=[Depends(require_permission(Permission.FLOOR_DELETE))])
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

    # Delete floor plan file if exists
    if floor.floor_plan_path and os.path.exists(floor.floor_plan_path):
        try:
            os.remove(floor.floor_plan_path)
        except Exception as e:
            print(f"Failed to delete floor plan file: {e}")

    db.delete(floor)
    db.commit()
    return None


@router.post("/{floor_id}/upload-plan", dependencies=[Depends(require_permission(Permission.FLOOR_EDIT))])
async def upload_floor_plan(
    floor_id: int,
    file: UploadFile = File(...),
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Upload floor plan image for a floor."""
    # Verify floor exists and belongs to organization
    floor = db.query(FloorModel).join(BuildingModel).filter(
        FloorModel.id == floor_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024*1024):.1f} MB"
        )

    # Delete old floor plan if exists
    if floor.floor_plan_path and os.path.exists(floor.floor_plan_path):
        try:
            os.remove(floor.floor_plan_path)
        except Exception as e:
            print(f"Failed to delete old floor plan: {e}")

    # Generate unique filename
    unique_filename = f"floor_{floor_id}_{uuid.uuid4()}{file_ext}"
    file_path = FLOOR_PLAN_UPLOAD_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update floor with file path
    floor.floor_plan_path = str(file_path)
    db.commit()
    db.refresh(floor)

    return {
        "success": True,
        "file_path": str(file_path),
        "message": "Floor plan uploaded successfully"
    }


@router.delete("/{floor_id}/floor-plan", dependencies=[Depends(require_permission(Permission.FLOOR_EDIT))])
async def delete_floor_plan(
    floor_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Delete floor plan image for a floor."""
    # Verify floor exists and belongs to organization
    floor = db.query(FloorModel).join(BuildingModel).filter(
        FloorModel.id == floor_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    if not floor.floor_plan_path:
        raise HTTPException(status_code=404, detail="No floor plan found")

    # Delete file if exists
    if os.path.exists(floor.floor_plan_path):
        try:
            os.remove(floor.floor_plan_path)
        except Exception as e:
            print(f"Failed to delete floor plan file: {e}")

    # Clear floor plan path
    floor.floor_plan_path = None
    db.commit()

    return {
        "success": True,
        "message": "Floor plan deleted successfully"
    }


@router.get("/{floor_id}/floor-plan")
async def get_floor_plan(
    floor_id: int,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get floor plan image for a floor."""
    # Verify floor exists and belongs to organization
    floor = db.query(FloorModel).join(BuildingModel).filter(
        FloorModel.id == floor_id,
        BuildingModel.organization_id == organization.id
    ).first()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    if not floor.floor_plan_path or not os.path.exists(floor.floor_plan_path):
        raise HTTPException(status_code=404, detail="Floor plan not found")

    return FileResponse(floor.floor_plan_path)
