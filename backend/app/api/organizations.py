"""
Organization CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.schemas.organization import Organization, OrganizationCreate, OrganizationUpdate
from app.models.organization import Organization as OrganizationModel
from app.api.deps import get_db, require_permission
from app.utils.permissions import Permission

router = APIRouter()


@router.get("/", response_model=List[Organization], dependencies=[Depends(require_permission(Permission.ORGANIZATION_VIEW))])
async def list_organizations(db: Session = Depends(get_db)):
    """List all organizations."""
    return db.query(OrganizationModel).all()


@router.post("/", response_model=Organization, status_code=201, dependencies=[Depends(require_permission(Permission.ORGANIZATION_CREATE))])
async def create_organization(organization: OrganizationCreate, db: Session = Depends(get_db)):
    """Create a new organization."""
    # Check if org_id already exists
    existing_org = db.query(OrganizationModel).filter(OrganizationModel.org_id == organization.org_id).first()
    if existing_org:
        raise HTTPException(status_code=400, detail=f"Organization with org_id '{organization.org_id}' already exists")

    db_organization = OrganizationModel(**organization.model_dump())
    db.add(db_organization)
    db.commit()
    db.refresh(db_organization)
    return db_organization


@router.get("/{organization_id}", response_model=Organization, dependencies=[Depends(require_permission(Permission.ORGANIZATION_VIEW))])
async def get_organization(organization_id: int, db: Session = Depends(get_db)):
    """Get organization by ID."""
    organization = db.query(OrganizationModel).filter(OrganizationModel.id == organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    return organization


@router.put("/{organization_id}", response_model=Organization, dependencies=[Depends(require_permission(Permission.ORGANIZATION_EDIT))])
async def update_organization(organization_id: int, organization_update: OrganizationUpdate, db: Session = Depends(get_db)):
    """Update organization."""
    organization = db.query(OrganizationModel).filter(OrganizationModel.id == organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = organization_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(organization, key, value)

    db.commit()
    db.refresh(organization)
    return organization


@router.delete("/{organization_id}", status_code=204, dependencies=[Depends(require_permission(Permission.ORGANIZATION_DELETE))])
async def delete_organization(organization_id: int, db: Session = Depends(get_db)):
    """Delete organization (cascades to buildings, floors, rooms)."""
    organization = db.query(OrganizationModel).filter(OrganizationModel.id == organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(organization)
    db.commit()
    return None
