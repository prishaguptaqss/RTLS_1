"""
Create an admin staff account in the database.

Usage:
  cd backend
  python scripts/create_admin.py

This script will create a Staff row with email `admin@rtls.com` and password `admin123`
if a staff with that email does not already exist.
"""
from app.database import SessionLocal
from app.models.staff import Staff
from app.utils.auth import get_password_hash


def create_admin(email: str = "admin@rtls.com", password: str = "admin123"):
    db = SessionLocal()
    try:
        existing = db.query(Staff).filter(Staff.email == email).first()
        if existing:
            print(f"Admin user already exists: {existing.email} (staff_id={existing.staff_id})")
            return existing

        # generate a simple staff_id
        staff_id = "admin"
        # ensure uniqueness: append numeric suffix if needed
        counter = 1
        while db.query(Staff).filter(Staff.staff_id == staff_id).first():
            staff_id = f"admin{counter}"
            counter += 1

        password_hash = get_password_hash(password)

        admin = Staff(
            staff_id=staff_id,
            name="Administrator",
            email=email,
            password_hash=password_hash,
            is_admin=True,
            is_active=True
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"Created admin user: {admin.email} (staff_id={admin.staff_id})")
        return admin
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
