"""
Authentication API endpoints.
Handles login, logout, and current user information.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
from app.api.deps import get_db, get_current_staff, get_staff_permissions
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, TokenResponse, CurrentUserResponse, ChangePasswordRequest
from app.utils.auth import verify_password, create_access_token, get_password_hash


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

    # Create access token with organization information
    access_token = create_access_token(data={
        "sub": staff.staff_id,
        "org_id": staff.organization_id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "organization_id": staff.organization_id,
        "organization_name": staff.organization.name if staff.organization else None
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
        profile_picture=current_staff.profile_picture,
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


@router.post("/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Change password endpoint - allows authenticated users to change their password.

    Args:
        password_data: Current password, new password, and confirm new password
        current_staff: Currently authenticated staff member
        db: Database session

    Returns:
        Success message
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Verify new password confirmation
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )

    # Validate new password strength (same as password reset)
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Check for at least one uppercase, one lowercase, one digit, and one special character
    import re
    if not re.search(r'[A-Z]', password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter"
        )
    if not re.search(r'[a-z]', password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter"
        )
    if not re.search(r'\d', password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number"
        )
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character"
        )

    # Check if new password is same as current password
    if verify_password(password_data.new_password, current_staff.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Hash and update password
    current_staff.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


@router.post("/upload-profile-picture")
async def upload_profile_picture(
    profile_picture: UploadFile = File(...),
    current_staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    """
    Upload profile picture for the authenticated user.

    Args:
        profile_picture: Image file to upload
        current_staff: Currently authenticated staff member
        db: Database session

    Returns:
        URL of the uploaded profile picture
    """
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_ext = Path(profile_picture.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
        )

    # Validate file size (max 5MB)
    profile_picture.file.seek(0, 2)  # Seek to end
    file_size = profile_picture.file.tell()
    profile_picture.file.seek(0)  # Reset to beginning

    max_size = 5 * 1024 * 1024  # 5MB
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )

    # Create uploads directory if it doesn't exist
    uploads_dir = Path(__file__).parent.parent.parent / "uploads" / "profile_pictures"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = uploads_dir / unique_filename

    # Delete old profile picture if exists
    if current_staff.profile_picture:
        old_file_path = Path(__file__).parent.parent.parent / "uploads" / current_staff.profile_picture.replace("/uploads/", "")
        if old_file_path.exists():
            old_file_path.unlink()

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Update staff profile picture URL
    profile_picture_url = f"/uploads/profile_pictures/{unique_filename}"
    current_staff.profile_picture = profile_picture_url
    db.commit()

    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture_url": profile_picture_url
    }
