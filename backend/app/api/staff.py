"""
Staff Management API endpoints.
Handles CRUD operations for staff members.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import secrets
import string
from app.api.deps import get_db, get_current_staff, require_permission
from app.models.staff import Staff
from app.models.role import Role
from app.schemas.staff import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    StaffListResponse,
    StaffChangePassword
)
from app.utils.auth import get_password_hash, verify_password
from app.utils.permissions import Permission


router = APIRouter(prefix="/staff", tags=["Staff Management"])


def generate_random_password(length: int = 12) -> str:
    """Generate a random password."""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


@router.get("", response_model=StaffListResponse, dependencies=[Depends(require_permission(Permission.STAFF_VIEW))])
def list_staff(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    List all staff members.

    Admins see all staff. Regular staff see staff in their organization.
    """
    query = db.query(Staff)

    # Filter by organization for non-admin users
    if not current_staff.is_admin and current_staff.organization_id:
        query = query.filter(Staff.organization_id == current_staff.organization_id)

    total = query.count()
    staff = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "staff": staff
    }


@router.get("/{staff_id}", response_model=StaffResponse, dependencies=[Depends(require_permission(Permission.STAFF_VIEW))])
def get_staff_member(
    staff_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Get a specific staff member by ID.
    """
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID {staff_id} not found"
        )

    # Check access
    if not current_staff.is_admin:
        if staff.organization_id != current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this staff member"
            )

    return staff


@router.post("", response_model=StaffResponse, dependencies=[Depends(require_permission(Permission.STAFF_CREATE))])
def create_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Create a new staff member.

    Returns the created staff member along with the auto-generated password.
    """
    # Check if staff_id already exists
    existing_staff_id = db.query(Staff).filter(Staff.staff_id == staff_data.staff_id).first()
    if existing_staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Staff ID '{staff_data.staff_id}' already exists"
        )

    # Check if email already exists
    existing_email = db.query(Staff).filter(Staff.email == staff_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{staff_data.email}' is already registered"
        )

    # Generate password if not provided
    password = staff_data.password if staff_data.password else generate_random_password()

    # For non-admin users, enforce organization scoping
    org_id = staff_data.organization_id
    if not current_staff.is_admin:
        if not current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Staff member must belong to an organization to create staff"
            )
        org_id = current_staff.organization_id

        # Non-admins cannot create admins
        if staff_data.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create admin users"
            )

    # Create staff member
    new_staff = Staff(
        staff_id=staff_data.staff_id,
        name=staff_data.name,
        email=staff_data.email,
        phone=staff_data.phone,
        password_hash=get_password_hash(password),
        is_admin=staff_data.is_admin,
        is_active=True,
        organization_id=org_id
    )

    # Add roles
    if staff_data.role_ids:
        roles = db.query(Role).filter(Role.id.in_(staff_data.role_ids)).all()
        new_staff.roles = roles

    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)

    # Note: In production, you should send password via email or secure channel
    # For now, we'll return it in the response (you may want to modify this)
    response = StaffResponse.model_validate(new_staff)
    response.temporary_password = password  # Add temp password to response

    return response


@router.put("/{staff_id}", response_model=StaffResponse, dependencies=[Depends(require_permission(Permission.STAFF_EDIT))])
def update_staff(
    staff_id: int,
    staff_data: StaffUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Update an existing staff member.
    """
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID {staff_id} not found"
        )

    # Check access
    if not current_staff.is_admin:
        if staff.organization_id != current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to update this staff member"
            )

        # Non-admins cannot change admin status
        if staff_data.is_admin is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can change admin status"
            )

    # Update fields
    if staff_data.name is not None:
        staff.name = staff_data.name

    if staff_data.email is not None:
        # Check if new email already exists
        existing = db.query(Staff).filter(
            Staff.email == staff_data.email,
            Staff.id != staff_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{staff_data.email}' is already registered"
            )
        staff.email = staff_data.email

    if staff_data.phone is not None:
        staff.phone = staff_data.phone

    if staff_data.is_active is not None:
        staff.is_active = staff_data.is_active

    if staff_data.is_admin is not None and current_staff.is_admin:
        staff.is_admin = staff_data.is_admin

    # Update roles
    if staff_data.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(staff_data.role_ids)).all()
        staff.roles = roles

    db.commit()
    db.refresh(staff)

    return staff


@router.delete("/{staff_id}", dependencies=[Depends(require_permission(Permission.STAFF_DELETE))])
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Delete a staff member.
    """
    staff = db.query(Staff).filter(Staff.id == staff_id).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID {staff_id} not found"
        )

    # Prevent self-deletion
    if staff.id == current_staff.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Check access
    if not current_staff.is_admin:
        if staff.organization_id != current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to delete this staff member"
            )

    db.delete(staff)
    db.commit()

    return {"message": f"Staff member '{staff.name}' deleted successfully"}


@router.post("/change-password")
def change_password(
    password_data: StaffChangePassword,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Change current staff member's password.
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Update password
    current_staff.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}
