"""
Permission API endpoints.
Provides read-only access to available permissions.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from collections import defaultdict
from app.api.deps import get_db, require_permission
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
    db: Session = Depends(get_db)
):
    """
    List permissions grouped by module.
    Useful for building permission selection UI.
    """
    permissions = db.query(PermissionModel).order_by(PermissionModel.module, PermissionModel.name).all()

    # Group by module
    grouped: Dict[str, List[PermissionModel]] = defaultdict(list)
    for permission in permissions:
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
