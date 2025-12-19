"""Test login functionality"""
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.staff import Staff
from app.utils.auth import verify_password, create_access_token

def test_login():
    db = SessionLocal()
    try:
        # Find staff by email
        email = "admin@rtls.com"
        password = "admin123"

        print(f"Looking for staff with email: {email}")
        staff = db.query(Staff).filter(Staff.email == email).first()

        if not staff:
            print("ERROR: Staff not found!")
            return False

        print(f"Found staff: {staff.staff_id}, {staff.name}, {staff.email}")
        print(f"Password hash length: {len(staff.password_hash)}")
        print(f"Is admin: {staff.is_admin}")
        print(f"Is active: {staff.is_active}")

        # Verify password
        print(f"\nVerifying password...")
        is_valid = verify_password(password, staff.password_hash)
        print(f"Password valid: {is_valid}")

        if not is_valid:
            print("ERROR: Password verification failed!")
            return False

        # Create token
        print(f"\nCreating access token...")
        token = create_access_token(data={"sub": staff.staff_id})
        print(f"Token created: {token[:50]}...")

        print("\n✅ Login test PASSED!")
        return True

    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_login()
    sys.exit(0 if success else 1)
