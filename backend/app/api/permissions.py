"""
Permission API endpoints.
Provides read-only access to available permissions.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from collections import defaultdict
from app.api.deps import get_db, require_permission, get_current_staff, get_staff_permissions
from app.models.staff import Staff
from app.models.permission import Permission as PermissionModel
from app.schemas.permission import PermissionResponse, PermissionListResponse, PermissionsByModule
from app.utils.permissions import Permission


router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("", response_model=PermissionListResponse, dependencies=[Depends(require_permission(Permission.ROLE_VIEW))])
def list_permissions(
    db: Session = Depends(get_db)
):
    """
    List all available permissions.
    """
    permissions = db.query(PermissionModel).order_by(PermissionModel.module, PermissionModel.name).all()

    return {
        "total": len(permissions),
        "permissions": permissions
    }


@router.get("/grouped", response_model=List[PermissionsByModule], dependencies=[Depends(require_permission(Permission.ROLE_VIEW))])
def list_permissions_grouped(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    List permissions grouped by module.
    Useful for building permission selection UI.

    Only returns modules that the current user has VIEW access to.
    Admins see all modules.
    """
    # Get all permissions
    all_permissions = db.query(PermissionModel).order_by(PermissionModel.module, PermissionModel.name).all()

    # If user is admin, return all permissions
    if current_staff.is_admin:
        grouped: Dict[str, List[PermissionModel]] = defaultdict(list)
        for permission in all_permissions:
            grouped[permission.module].append(permission)

        result = [
            {
                "module": module,
                "permissions": perms
            }
            for module, perms in grouped.items()
        ]
        return result

    # For non-admin users, get their permission codes
    user_permission_codes = get_staff_permissions(current_staff, db)

    # Map of modules to their VIEW permission codes
    module_view_permissions = {
        'dashboard': 'DASHBOARD_VIEW',
        'building': 'BUILDING_VIEW',
        'entity': 'ENTITY_VIEW',
        'device': 'DEVICE_VIEW',
        'live_position': 'LIVE_POSITION_VIEW',
        'live_tracking': 'LIVE_TRACKING_VIEW',
        'notification': 'NOTIFICATION_VIEW',
        'organization': 'ORGANIZATION_VIEW',
        'staff': 'STAFF_VIEW',
        'role': 'ROLE_VIEW',
        'settings': 'SETTINGS_VIEW'
    }

    # Filter permissions to only include modules the user has VIEW access to
    accessible_modules = set()
    for module, view_permission in module_view_permissions.items():
        if view_permission in user_permission_codes:
            accessible_modules.add(module)

    # Group permissions only for accessible modules
    grouped: Dict[str, List[PermissionModel]] = defaultdict(list)
    for permission in all_permissions:
        if permission.module in accessible_modules:
            grouped[permission.module].append(permission)

    # Convert to list format
    result = [
        {
            "module": module,
            "permissions": perms
        }
        for module, perms in grouped.items()
    ]

    return result
