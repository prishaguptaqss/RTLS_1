"""
Authentication API endpoints.
Handles login, logout, and current user information.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_staff, get_staff_permissions
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, TokenResponse, CurrentUserResponse
from app.utils.auth import verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint - authenticates staff and returns JWT token.

    Args:
        login_data: Email and password
        db: Database session

    Returns:
        JWT access token
    """
    # Find staff by email
    staff = db.query(Staff).filter(Staff.email == login_data.email).first()

    if not staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Verify password
    if not verify_password(login_data.password, staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if account is active
    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    # Create access token
    access_token = create_access_token(data={"sub": staff.staff_id})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=CurrentUserResponse)
def get_current_user(
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user information with permissions.

    Args:
        current_staff: Current authenticated staff member
        db: Database session

    Returns:
        Current user info including permissions and roles
    """
    # Get permissions
    permissions = get_staff_permissions(current_staff, db)

    # Get role names
    role_names = [role.name for role in current_staff.roles]

    return CurrentUserResponse(
        id=current_staff.id,
        staff_id=current_staff.staff_id,
        name=current_staff.name,
        email=current_staff.email,
        phone=current_staff.phone,
        is_admin=current_staff.is_admin,
        is_active=current_staff.is_active,
        organization_id=current_staff.organization_id,
        created_at=current_staff.created_at,
        permissions=permissions,
        roles=role_names
    )


@router.post("/logout")
def logout():
    """
    Logout endpoint.

    Since we're using JWT tokens, logout is handled client-side by removing the token.
    This endpoint exists for API completeness and could be extended with token blacklisting.
    """
    return {"message": "Successfully logged out"}
