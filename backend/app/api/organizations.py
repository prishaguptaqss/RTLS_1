"""
Organization CRUD endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from pathlib import Path

from app.schemas.organization import Organization, OrganizationCreate, OrganizationUpdate
from app.models.organization import Organization as OrganizationModel
from app.models.staff import Staff
from app.api.deps import get_db, require_permission, get_current_staff
from app.utils.permissions import Permission

router = APIRouter()

# Configuration for file uploads
UPLOAD_DIR = Path("uploads/logos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}


@router.get("/", response_model=List[Organization])
async def list_organizations(
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    List organizations based on user access.

    - Admins can see all organizations
    - Non-admin users can only see their assigned organization
    """
    if current_staff.is_admin:
        # Admins can see all organizations
        return db.query(OrganizationModel).all()
    else:
        # Non-admin users can only see their organization
        if current_staff.organization_id is None:
            # User not assigned to any organization
            return []

        organization = db.query(OrganizationModel).filter(
            OrganizationModel.id == current_staff.organization_id
        ).first()

        return [organization] if organization else []


async def save_logo_file(file: UploadFile) -> str:
    """Save uploaded logo file and return the file path."""
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

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)

    return str(file_path)


@router.post("/", response_model=Organization, status_code=201)
async def create_organization(
    org_id: str = Form(...),
    name: str = Form(...),
    display_name: str = Form(...),
    address: str = Form(...),
    country: str = Form(...),
    pincode: str = Form(...),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Create a new organization with optional logo upload."""
    # Check if org_id already exists
    existing_org = db.query(OrganizationModel).filter(OrganizationModel.org_id == org_id).first()
    if existing_org:
        raise HTTPException(status_code=400, detail=f"Organization with org_id '{org_id}' already exists")

    # Handle logo upload if provided
    logo_path = None
    if logo:
        logo_path = await save_logo_file(logo)

    # Create organization schema instance for validation
    org_data = OrganizationCreate(
        org_id=org_id,
        name=name,
        display_name=display_name,
        address=address,
        country=country,
        pincode=pincode,
        logo=logo_path
    )

    db_organization = OrganizationModel(**org_data.model_dump())
    db.add(db_organization)
    db.commit()
    db.refresh(db_organization)
    return db_organization


@router.get("/{organization_id}", response_model=Organization, dependencies=[Depends(require_permission(Permission.ORGANIZATION_VIEW))])
async def get_organization(
    organization_id: int,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Get organization by ID.

    - Admins can access any organization
    - Non-admin users can only access their assigned organization
    """
    organization = db.query(OrganizationModel).filter(OrganizationModel.id == organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Validate access
    if not current_staff.is_admin:
        if current_staff.organization_id != organization_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You do not have permission to view this organization."
            )

    return organization


@router.put("/{organization_id}", response_model=Organization)
async def update_organization(
    organization_id: int,
    name: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    pincode: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Update organization with optional logo upload.

    - Admins can update any organization
    - Non-admin users can only update their assigned organization
    """
    organization = db.query(OrganizationModel).filter(OrganizationModel.id == organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Validate access
    if not current_staff.is_admin:
        if current_staff.organization_id != organization_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You do not have permission to update this organization."
            )

    # Handle logo upload if provided
    logo_path = None
    if logo:
        # Delete old logo if exists
        if organization.logo and os.path.exists(organization.logo):
            try:
                os.remove(organization.logo)
            except Exception:
                pass  # Ignore errors if old file doesn't exist
        logo_path = await save_logo_file(logo)

    # Create update schema instance for validation
    org_update = OrganizationUpdate(
        name=name,
        display_name=display_name,
        address=address,
        country=country,
        pincode=pincode,
        logo=logo_path
    )

    update_data = org_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(organization, key, value)

    db.commit()
    db.refresh(organization)
    return organization


@router.delete("/{organization_id}", status_code=204, dependencies=[Depends(require_permission(Permission.ORGANIZATION_DELETE))])
async def delete_organization(
    organization_id: int,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Delete organization (cascades to buildings, floors, rooms).

    - Admins can delete any organization
    - Non-admin users can only delete their assigned organization
    """
    organization = db.query(OrganizationModel).filter(OrganizationModel.id == organization_id).first()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Validate access
    if not current_staff.is_admin:
        if current_staff.organization_id != organization_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You do not have permission to delete this organization."
            )

    db.delete(organization)
    db.commit()
    return None
