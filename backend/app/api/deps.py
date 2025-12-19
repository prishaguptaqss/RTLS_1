"""
Dependency injection functions for API routes.
"""
from fastapi import Header, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import SessionLocal
from app.models.organization import Organization
from app.models.staff import Staff
from app.models.permission import Permission as PermissionModel
from app.utils.auth import decode_access_token
from app.utils.permissions import Permission


# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)


def get_db():
    """
    Dependency for database session.

    Yields session and ensures cleanup via try/finally.

    Usage in route:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_organization(
    x_organization_id: int = Header(None, alias="X-Organization-ID"),
    db: Session = Depends(get_db)
) -> Organization:
    """
    Get current organization from request header.

    The organization ID is passed via X-Organization-ID header.
    This dependency ensures all API calls are scoped to an organization.

    Usage in route:
        @router.get("/entities")
        def list_entities(org: Organization = Depends(get_current_organization)):
            return org.entities
    """
    if not x_organization_id:
        raise HTTPException(
            status_code=400,
            detail="Organization ID required. Please provide X-Organization-ID header."
        )

    org = db.query(Organization).filter(Organization.id == x_organization_id).first()
    if not org:
        raise HTTPException(
            status_code=404,
            detail=f"Organization with ID {x_organization_id} not found"
        )

    return org


async def get_current_staff(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Staff:
    """
    Get current authenticated staff member from JWT token.

    Usage in route:
        @router.get("/profile")
        def get_profile(current_staff: Staff = Depends(get_current_staff)):
            return current_staff
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    staff_id: str = payload.get("sub")
    if not staff_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    staff = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Staff member not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    return staff


async def get_current_active_staff(
    current_staff: Staff = Depends(get_current_staff)
) -> Staff:
    """
    Get current authenticated and active staff member.

    Usage in route:
        @router.get("/protected")
        def protected_route(staff: Staff = Depends(get_current_active_staff)):
            return {"message": "Access granted"}
    """
    if not current_staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    return current_staff


def get_staff_permissions(staff: Staff, db: Session) -> List[str]:
    """
    Get all permission codes for a staff member.

    Args:
        staff: The staff member
        db: Database session

    Returns:
        List of permission codes
    """
    if staff.is_admin:
        # Admins have all permissions
        all_permissions = db.query(PermissionModel).all()
        return [p.code for p in all_permissions]

    # Get permissions from staff roles
    permission_codes = set()
    for role in staff.roles:
        for permission in role.permissions:
            permission_codes.add(permission.code)

    return list(permission_codes)


def require_permission(required_permission: Permission):
    """
    Dependency factory that creates a permission check dependency.

    Usage in route:
        @router.post("/buildings", dependencies=[Depends(require_permission(Permission.BUILDING_CREATE))])
        def create_building(...):
            # This will only execute if user has BUILDING_CREATE permission
            pass
    """
    async def permission_checker(
        current_staff: Staff = Depends(get_current_staff),
        db: Session = Depends(get_db)
    ):
        # Admins bypass all permission checks
        if current_staff.is_admin:
            return current_staff

        # Get staff permissions
        permissions = get_staff_permissions(current_staff, db)

        if required_permission not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required permission: {required_permission}"
            )

        return current_staff

    return permission_checker


def require_admin():
    """
    Dependency that requires admin access.

    Usage in route:
        @router.delete("/users/{id}", dependencies=[Depends(require_admin)])
        def delete_user(...):
            # Only admins can access this
            pass
    """
    async def admin_checker(current_staff: Staff = Depends(get_current_staff)):
        if not current_staff.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return current_staff

    return admin_checker
