"""
Staff Management API endpoints.
Handles CRUD operations for staff members.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import secrets
import string
from app.api.deps import get_db, get_current_staff, get_current_organization, require_permission
from app.models.staff import Staff
from app.models.role import Role
from app.models.organization import Organization
from app.schemas.staff import (
    StaffCreate,
    StaffUpdate,
    StaffResponse,
    StaffListResponse,
    StaffChangePassword
)
from app.utils.auth import get_password_hash, verify_password
from app.utils.permissions import Permission
from app.utils.email_config import get_email_config
from app.utils.email import send_welcome_email


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
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    List all staff members within the selected organization.

    Filters staff by the current organization context (from X-Organization-ID header).
    """
    query = db.query(Staff).filter(Staff.organization_id == organization.id)

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
        # Allow access if same organization OR if viewing global admin (org_id = NULL)
        if staff.organization_id is not None and staff.organization_id != current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this staff member"
            )

    return staff


@router.post("", response_model=StaffResponse, dependencies=[Depends(require_permission(Permission.STAFF_CREATE))])
async def create_staff(
    staff_data: StaffCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Create a new staff member within the selected organization.

    Uses the organization from X-Organization-ID header.
    Sends welcome email with credentials to the new staff member.
    """
    # Check if staff_id already exists within this organization
    existing_staff_id = db.query(Staff).filter(
        Staff.staff_id == staff_data.staff_id,
        Staff.organization_id == organization.id
    ).first()
    if existing_staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Staff ID '{staff_data.staff_id}' already exists in this organization"
        )

    # Check if email already exists (globally, not per org)
    existing_email = db.query(Staff).filter(Staff.email == staff_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{staff_data.email}' is already registered"
        )

    # Generate password if not provided
    password = staff_data.password if staff_data.password else generate_random_password()

    # Non-admins cannot create admins
    if not current_staff.is_admin and staff_data.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create admin users"
        )

    # Create staff member within the current organization context
    new_staff = Staff(
        staff_id=staff_data.staff_id,
        name=staff_data.name,
        email=staff_data.email,
        phone=staff_data.phone,
        password_hash=get_password_hash(password),
        is_admin=staff_data.is_admin,
        is_active=True,
        organization_id=organization.id
    )

    # Add roles (ensure they belong to the same organization)
    if staff_data.role_ids:
        roles = db.query(Role).filter(
            Role.id.in_(staff_data.role_ids),
            Role.organization_id == organization.id
        ).all()

        # Validate that all requested roles were found in this organization
        if len(roles) != len(staff_data.role_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more roles do not belong to this organization"
            )

        new_staff.roles = roles

    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)

    # Send welcome email with credentials
    email_result = await send_welcome_email(
        to_email=staff_data.email,
        staff_name=staff_data.name,
        staff_id=staff_data.staff_id,
        password=password,
        db=db,
        organization_id=organization.id
    )

    # Prepare response
    response = StaffResponse.model_validate(new_staff)

    # Set email warning/success message based on email result
    if email_result["success"]:
        response.email_warning = email_result["message"]
        # If email was not sent (dev mode or no SMTP config), include password in response
        if "Email configuration not set" in email_result["message"] or "development mode" in email_result["message"].lower():
            response.temporary_password = password
    else:
        response.email_warning = f"⚠️ {email_result['message']}"

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
        # Non-admins cannot edit admin accounts
        if staff.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can edit admin accounts"
            )

        # Allow update if same organization
        if staff.organization_id is None or staff.organization_id != current_staff.organization_id:
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

    # Update roles (ensure they belong to the same organization as the staff)
    if staff_data.role_ids is not None:
        # Get the staff's organization
        staff_org_id = staff.organization_id

        roles = db.query(Role).filter(
            Role.id.in_(staff_data.role_ids),
            Role.organization_id == staff_org_id
        ).all()

        # Validate that all requested roles were found in the staff's organization
        if len(roles) != len(staff_data.role_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more roles do not belong to the staff member's organization"
            )

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
        # Non-admins cannot delete admin accounts
        if staff.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete admin accounts"
            )

        # Allow delete if same organization
        if staff.organization_id is None or staff.organization_id != current_staff.organization_id:
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
