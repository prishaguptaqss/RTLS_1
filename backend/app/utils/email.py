"""Email utility functions for sending OTP and notifications."""
import random
import string
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from typing import Optional
from app.config import settings
from app.utils.email_config import get_email_config


def generate_otp() -> str:
    """Generate a random 4-digit OTP."""
    return ''.join(random.choices(string.digits, k=4))


async def send_otp_email(to_email: str, otp: str, staff_name: str, db: Optional[Session] = None, organization_id: Optional[int] = None) -> bool:
    """
    Send OTP email to user for password reset.

    Args:
        to_email: Recipient email address
        otp: 4-digit OTP code
        staff_name: Name of the staff member
        db: Database session (optional, for org-specific config)
        organization_id: Organization ID (optional, for org-specific config)

    Returns:
        True if email sent successfully, False otherwise
    """
    # Get email configuration (org-specific or global)
    email_config = get_email_config(db, organization_id) if db else {
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_password": settings.SMTP_PASSWORD,
        "smtp_from_email": settings.SMTP_FROM_EMAIL,
        "smtp_from_name": settings.SMTP_FROM_NAME,
    }

    # DEVELOPMENT MODE: Log OTP instead of sending email if SMTP password is not set
    if not email_config["smtp_password"]:
        print(f"\n{'='*60}")
        print(f"🔐 PASSWORD RESET OTP (DEVELOPMENT MODE)")
        print(f"{'='*60}")
        print(f"To: {to_email}")
        print(f"Name: {staff_name}")
        print(f"OTP: {otp}")
        print(f"Valid for: 1 minute")
        print(f"{'='*60}\n")
        return True

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Password Reset OTP - RTLS System"
        message["From"] = f"{email_config['smtp_from_name']} <{email_config['smtp_from_email']}>"
        message["To"] = to_email

        # Create HTML content
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Password Reset Request</h2>
                    <p>Hello {staff_name},</p>
                    <p>You have requested to reset your password. Please use the following One-Time Password (OTP) to proceed:</p>

                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <h1 style="color: #2563eb; font-size: 48px; margin: 0; letter-spacing: 10px;">{otp}</h1>
                    </div>

                    <p><strong>Important:</strong></p>
                    <ul>
                        <li>This OTP is valid for <strong>1 minute</strong> only</li>
                        <li>Do not share this code with anyone</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>

                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        Best regards,<br>
                        RTLS System Team
                    </p>
                </div>
            </body>
        </html>
        """

        # Attach HTML content
        part = MIMEText(html, "html")
        message.attach(part)

        # Send email using aiosmtplib
        await aiosmtplib.send(
            message,
            hostname=email_config["smtp_host"],
            port=email_config["smtp_port"],
            username=email_config["smtp_username"],
            password=email_config["smtp_password"],
            start_tls=True,
        )

        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


async def send_password_reset_success_email(to_email: str, staff_name: str, db: Optional[Session] = None, organization_id: Optional[int] = None) -> bool:
    """
    Send confirmation email after successful password reset.

    Args:
        to_email: Recipient email address
        staff_name: Name of the staff member
        db: Database session (optional, for org-specific config)
        organization_id: Organization ID (optional, for org-specific config)

    Returns:
        True if email sent successfully, False otherwise
    """
    # Get email configuration (org-specific or global)
    email_config = get_email_config(db, organization_id) if db else {
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_password": settings.SMTP_PASSWORD,
        "smtp_from_email": settings.SMTP_FROM_EMAIL,
        "smtp_from_name": settings.SMTP_FROM_NAME,
    }

    # DEVELOPMENT MODE: Skip email if SMTP password is not set
    if not email_config["smtp_password"]:
        print(f"\n✅ Password reset successful for {to_email} (email skipped in dev mode)\n")
        return True

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Password Reset Successful - RTLS System"
        message["From"] = f"{email_config['smtp_from_name']} <{email_config['smtp_from_email']}>"
        message["To"] = to_email

        # Create HTML content
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #16a34a;">Password Reset Successful</h2>
                    <p>Hello {staff_name},</p>
                    <p>Your password has been successfully reset.</p>

                    <div style="background-color: #f0fdf4; padding: 20px; margin: 20px 0; border-left: 4px solid #16a34a; border-radius: 4px;">
                        <p style="margin: 0;">✓ You can now log in with your new password</p>
                    </div>

                    <p><strong>Security tip:</strong> If you did not perform this action, please contact your administrator immediately.</p>

                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        Best regards,<br>
                        RTLS System Team
                    </p>
                </div>
            </body>
        </html>
        """

        # Attach HTML content
        part = MIMEText(html, "html")
        message.attach(part)

        # Send email using aiosmtplib
        await aiosmtplib.send(
            message,
            hostname=email_config["smtp_host"],
            port=email_config["smtp_port"],
            username=email_config["smtp_username"],
            password=email_config["smtp_password"],
            start_tls=True,
        )

        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


async def send_welcome_email(to_email: str, staff_name: str, staff_id: str, password: str, db: Optional[Session] = None, organization_id: Optional[int] = None) -> dict:
    """
    Send welcome email with login credentials to newly created staff/user.

    Args:
        to_email: Recipient email address
        staff_name: Name of the staff member
        staff_id: Staff ID for login
        password: Auto-generated password
        db: Database session (optional, for org-specific config)
        organization_id: Organization ID (optional, for org-specific config)

    Returns:
        Dictionary with success status and message
    """
    import re

    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, to_email):
        return {
            "success": False,
            "message": f"Invalid email address: {to_email}. Please provide a valid email address."
        }

    # Get email configuration (org-specific or global)
    email_config = get_email_config(db, organization_id) if db else {
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME,
        "smtp_password": settings.SMTP_PASSWORD,
        "smtp_from_email": settings.SMTP_FROM_EMAIL,
        "smtp_from_name": settings.SMTP_FROM_NAME,
    }

    # Check if SMTP is configured
    if not email_config["smtp_password"]:
        print(f"\n{'='*60}")
        print(f"📧 WELCOME EMAIL (DEVELOPMENT MODE)")
        print(f"{'='*60}")
        print(f"To: {to_email}")
        print(f"Name: {staff_name}")
        print(f"Staff ID: {staff_id}")
        print(f"Password: {password}")
        print(f"{'='*60}\n")
        return {
            "success": True,
            "message": "Email configuration not set. Credentials displayed in console (development mode)."
        }

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Welcome to RTLS System - Your Login Credentials"
        message["From"] = f"{email_config['smtp_from_name']} <{email_config['smtp_from_email']}>"
        message["To"] = to_email

        # Create HTML content
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Welcome to RTLS System!</h2>
                    <p>Hello {staff_name},</p>
                    <p>Your account has been successfully created. Below are your login credentials:</p>

                    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold; color: #555;">Email:</td>
                                <td style="padding: 10px 0; color: #2563eb; font-weight: bold;">{to_email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold; color: #555;">Staff ID:</td>
                                <td style="padding: 10px 0; color: #2563eb; font-weight: bold;">{staff_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; font-weight: bold; color: #555;">Password:</td>
                                <td style="padding: 10px 0; color: #2563eb; font-weight: bold; font-family: monospace;">{password}</td>
                            </tr>
                        </table>
                    </div>

                    <p><strong>Important Security Instructions:</strong></p>
                    <ul>
                        <li>Please change your password after your first login</li>
                        <li>Do not share your credentials with anyone</li>
                        <li>Keep this email secure or delete it after changing your password</li>
                    </ul>

                    <div style="background-color: #fef3c7; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b; border-radius: 4px;">
                        <p style="margin: 0;"><strong>⚠️ Note:</strong> This is an auto-generated password. We strongly recommend changing it immediately after login.</p>
                    </div>

                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        If you have any questions or need assistance, please contact your system administrator.
                    </p>

                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        Best regards,<br>
                        RTLS System Team
                    </p>
                </div>
            </body>
        </html>
        """

        # Attach HTML content
        part = MIMEText(html, "html")
        message.attach(part)

        # Send email using aiosmtplib
        await aiosmtplib.send(
            message,
            hostname=email_config["smtp_host"],
            port=email_config["smtp_port"],
            username=email_config["smtp_username"],
            password=email_config["smtp_password"],
            start_tls=True,
        )

        return {
            "success": True,
            "message": f"Welcome email with credentials sent successfully to {to_email}"
        }

    except aiosmtplib.SMTPRecipientsRefused:
        return {
            "success": False,
            "message": f"Email address rejected by server: {to_email}. The email address may be invalid or does not exist."
        }
    except aiosmtplib.SMTPException as e:
        return {
            "success": False,
            "message": f"Failed to send email to {to_email}. SMTP Error: {str(e)}"
        }
    except Exception as e:
        error_msg = str(e).lower()
        if "connection" in error_msg or "timed out" in error_msg:
            return {
                "success": False,
                "message": f"Failed to connect to email server. Please check your email configuration and network connection."
            }
        elif "authentication" in error_msg or "auth" in error_msg:
            return {
                "success": False,
                "message": f"Email authentication failed. Please verify your SMTP credentials in settings."
            }
        else:
            return {
                "success": False,
                "message": f"Failed to send email to {to_email}. Error: {str(e)}"
            }
