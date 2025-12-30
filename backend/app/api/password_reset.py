"""API endpoints for password reset functionality."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.staff import Staff
from app.models.password_reset import PasswordResetToken
from app.models.organization_settings import OrganizationSettings
from app.schemas.password_reset import (
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
    ResendOTPRequest,
    PasswordResetResponse
)
from app.utils.email import generate_otp, send_otp_email, send_password_reset_success_email
from app.utils.email_config import get_email_config
from app.utils.auth import get_password_hash
from app.config import settings

router = APIRouter(prefix="/api/password-reset", tags=["Password Reset"])


@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Initiate forgot password flow by sending OTP to user's email.

    Steps:
    1. Verify email exists in system
    2. Generate 4-digit OTP
    3. Store OTP in database with 1-minute expiration
    4. Send OTP via email
    """
    # Check if staff exists
    staff = db.query(Staff).filter(Staff.email == request.email).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist"
        )

    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact administrator."
        )

    # Get email configuration (uses organization settings or falls back to global)
    email_config = get_email_config(db, staff.organization_id)
    if not email_config["smtp_username"] or not email_config["smtp_password"]:
        # Check if organization has partial settings to provide better error message
        org_settings = db.query(OrganizationSettings).filter(
            OrganizationSettings.organization_id == staff.organization_id
        ).first()

        if org_settings and (org_settings.smtp_username or org_settings.smtp_password):
            detail = "Organization email configuration is incomplete. Please ask your administrator to configure all email settings in the Settings page."
        else:
            detail = "Email is not configured for your organization. Please ask your administrator to configure email settings in the Settings page, or contact the system administrator to configure global email settings."

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )

    # Generate OTP
    otp = generate_otp()

    # Calculate expiration time (1 minute from now)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

    # Invalidate any existing tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.staff_id == staff.id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Create new token
    reset_token = PasswordResetToken(
        staff_id=staff.id,
        otp=otp,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()

    # Send OTP email (with organization-specific config)
    email_sent = await send_otp_email(staff.email, otp, staff.name, db, staff.organization_id)

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email. Please try again later."
        )

    return PasswordResetResponse(
        message="OTP has been sent to your email address. Valid for 1 minute.",
        success=True
    )


@router.post("/verify-otp", response_model=PasswordResetResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    """
    Verify the OTP entered by user.

    This endpoint is used to check if OTP is valid before showing password reset form.
    """
    # Get staff
    staff = db.query(Staff).filter(Staff.email == request.email).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid email or OTP"
        )

    # Get the most recent unused token
    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.staff_id == staff.id,
        PasswordResetToken.otp == request.otp,
        PasswordResetToken.is_used == False
    ).order_by(PasswordResetToken.created_at.desc()).first()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )

    # Check if token expired
    if datetime.utcnow() > token.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one."
        )

    return PasswordResetResponse(
        message="OTP verified successfully. You can now reset your password.",
        success=True
    )


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using verified OTP.

    Steps:
    1. Verify OTP is valid and not expired
    2. Update user's password
    3. Invalidate the OTP token
    4. Send confirmation email
    """
    # Get staff
    staff = db.query(Staff).filter(Staff.email == request.email).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid email or OTP"
        )

    # Get the most recent unused token
    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.staff_id == staff.id,
        PasswordResetToken.otp == request.otp,
        PasswordResetToken.is_used == False
    ).order_by(PasswordResetToken.created_at.desc()).first()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )

    # Check if token expired
    if datetime.utcnow() > token.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one."
        )

    # Update password
    staff.password_hash = get_password_hash(request.new_password)

    # Mark token as used
    token.is_used = True

    db.commit()

    # Send confirmation email (don't wait for it)
    try:
        await send_password_reset_success_email(staff.email, staff.name, db, staff.organization_id)
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to send confirmation email: {str(e)}")

    return PasswordResetResponse(
        message="Password reset successfully. You can now login with your new password.",
        success=True
    )


@router.post("/resend-otp", response_model=PasswordResetResponse)
async def resend_otp(
    request: ResendOTPRequest,
    db: Session = Depends(get_db)
):
    """
    Resend OTP if the previous one expired.

    This is the same as forgot-password but explicitly for resending.
    """
    # Check if staff exists
    staff = db.query(Staff).filter(Staff.email == request.email).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist"
        )

    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact administrator."
        )

    # Get email configuration (uses organization settings or falls back to global)
    email_config = get_email_config(db, staff.organization_id)
    if not email_config["smtp_username"] or not email_config["smtp_password"]:
        # Check if organization has partial settings to provide better error message
        org_settings = db.query(OrganizationSettings).filter(
            OrganizationSettings.organization_id == staff.organization_id
        ).first()

        if org_settings and (org_settings.smtp_username or org_settings.smtp_password):
            detail = "Organization email configuration is incomplete. Please ask your administrator to configure all email settings in the Settings page."
        else:
            detail = "Email is not configured for your organization. Please ask your administrator to configure email settings in the Settings page, or contact the system administrator to configure global email settings."

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )

    # Generate new OTP
    otp = generate_otp()

    # Calculate expiration time
    expires_at = datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

    # Invalidate any existing tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.staff_id == staff.id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Create new token
    reset_token = PasswordResetToken(
        staff_id=staff.id,
        otp=otp,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()

    # Send OTP email (with organization-specific config)
    email_sent = await send_otp_email(staff.email, otp, staff.name, db, staff.organization_id)

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email. Please try again later."
        )

    return PasswordResetResponse(
        message="New OTP has been sent to your email address. Valid for 1 minute.",
        success=True
    )
