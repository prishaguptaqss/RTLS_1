"""Email utility functions for sending OTP and notifications."""
import random
import string
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


def generate_otp() -> str:
    """Generate a random 4-digit OTP."""
    return ''.join(random.choices(string.digits, k=4))


async def send_otp_email(to_email: str, otp: str, staff_name: str) -> bool:
    """
    Send OTP email to user for password reset.

    Args:
        to_email: Recipient email address
        otp: 4-digit OTP code
        staff_name: Name of the staff member

    Returns:
        True if email sent successfully, False otherwise
    """
    # DEVELOPMENT MODE: Log OTP instead of sending email if SMTP password is not set
    if not settings.SMTP_PASSWORD:
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
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
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
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


async def send_password_reset_success_email(to_email: str, staff_name: str) -> bool:
    """
    Send confirmation email after successful password reset.

    Args:
        to_email: Recipient email address
        staff_name: Name of the staff member

    Returns:
        True if email sent successfully, False otherwise
    """
    # DEVELOPMENT MODE: Skip email if SMTP password is not set
    if not settings.SMTP_PASSWORD:
        print(f"\n✅ Password reset successful for {to_email} (email skipped in dev mode)\n")
        return True

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Password Reset Successful - RTLS System"
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
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
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False
