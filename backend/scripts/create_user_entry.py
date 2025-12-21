"""
Create a user row in the `users` table.

This will create a User row with email `admin@rtls.com` and name `Administrator`.
Note: the `users` table does not have a password field. Authentication uses the
`staff` table. If you need a passworded admin account, run
`python scripts/create_admin.py` (already added).

Usage:
  cd backend
  python scripts/create_user_entry.py
"""
from app.database import SessionLocal
from app.models.user import User
from app.utils.enums import UserStatus


def create_user(email: str = "admin@rtls.com"):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User already exists in users table: {existing.user_id} ({existing.email})")
            return existing

        # generate a simple user_id
        user_id = "admin"
        counter = 1
        while db.query(User).filter(User.user_id == user_id).first():
            user_id = f"admin{counter}"
            counter += 1

        user = User(
            user_id=user_id,
            name="Administrator",
            email=email,
            role="Admin",
            status=UserStatus.active
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"Created user in users table: {user.user_id} ({user.email})")
        return user
    finally:
        db.close()


if __name__ == "__main__":
    create_user()
