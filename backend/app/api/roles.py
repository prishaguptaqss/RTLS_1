"""
Role Management API endpoints.
Handles CRUD operations for roles and their permissions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_staff, get_current_organization, require_permission, require_admin
from app.models.staff import Staff
from app.models.role import Role
from app.models.permission import Permission as PermissionModel
from app.models.organization import Organization
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RoleListResponse,
    RoleWithStaffCount
)
from app.utils.permissions import Permission


router = APIRouter(prefix="/roles", tags=["Role Management"])


@router.get("", response_model=RoleListResponse, dependencies=[Depends(require_permission(Permission.ROLE_VIEW))])
def list_roles(
    skip: int = 0,
    limit: int = 100,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    List all roles within the selected organization.

    Filters roles by the current organization context (from X-Organization-ID header).
    Also includes global roles (organization_id = null) like "Admin" role.
    """
    # Include both organization-specific roles AND global roles (organization_id = null)
    query = db.query(Role).filter(
        (Role.organization_id == organization.id) | (Role.organization_id == None)
    )

    total = query.count()
    roles = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "roles": roles
    }


@router.get("/{role_id}", response_model=RoleResponse, dependencies=[Depends(require_permission(Permission.ROLE_VIEW))])
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Get a specific role by ID.
    """
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found"
        )

    # Check access: admins or same organization
    if not current_staff.is_admin:
        if role.organization_id and role.organization_id != current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this role"
            )

    return role


@router.post("", response_model=RoleResponse, dependencies=[Depends(require_permission(Permission.ROLE_CREATE))])
def create_role(
    role_data: RoleCreate,
    organization: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Create a new role within the selected organization.

    Uses the organization from X-Organization-ID header.
    """
    # Check if role name already exists within this organization
    existing_role = db.query(Role).filter(
        Role.name == role_data.name,
        Role.organization_id == organization.id
    ).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with name '{role_data.name}' already exists in this organization"
        )

    # Create role within the current organization context
    new_role = Role(
        name=role_data.name,
        description=role_data.description,
        organization_id=organization.id
    )

    # Add permissions
    if role_data.permission_ids:
        permissions = db.query(PermissionModel).filter(
            PermissionModel.id.in_(role_data.permission_ids)
        ).all()
        new_role.permissions = permissions

    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    return new_role


@router.put("/{role_id}", response_model=RoleResponse, dependencies=[Depends(require_permission(Permission.ROLE_EDIT))])
def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Update an existing role.
    """
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found"
        )

    # Protect system Admin role - cannot be modified by anyone
    if role.name == "Admin" and role.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The system Admin role cannot be modified"
        )

    # Check access: admins or same organization
    if not current_staff.is_admin:
        if role.organization_id and role.organization_id != current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to update this role"
            )

    # Update fields
    if role_data.name is not None:
        # Check if new name already exists
        existing = db.query(Role).filter(
            Role.name == role_data.name,
            Role.id != role_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with name '{role_data.name}' already exists"
            )
        role.name = role_data.name

    if role_data.description is not None:
        role.description = role_data.description

    # Update permissions
    if role_data.permission_ids is not None:
        permissions = db.query(PermissionModel).filter(
            PermissionModel.id.in_(role_data.permission_ids)
        ).all()
        role.permissions = permissions

    db.commit()
    db.refresh(role)

    return role


@router.delete("/{role_id}", dependencies=[Depends(require_permission(Permission.ROLE_DELETE))])
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Delete a role.
    """
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found"
        )

    # Protect system Admin role - cannot be deleted by anyone
    if role.name == "Admin" and role.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The system Admin role cannot be deleted"
        )

    # Check access: admins or same organization
    if not current_staff.is_admin:
        if role.organization_id and role.organization_id != current_staff.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to delete this role"
            )

    # Check if role is assigned to any staff
    if role.staff_members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete role. It is assigned to {len(role.staff_members)} staff member(s)"
        )

    db.delete(role)
    db.commit()

    return {"message": f"Role '{role.name}' deleted successfully"}
