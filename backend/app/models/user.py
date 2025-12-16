"""
User model - represents people being tracked in the hospital.
"""
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.enums import UserStatus


class User(Base):
    """
    User table - stores information about people being tracked.

    Each user can be assigned one or more BLE tags for location tracking.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, comment="Full name of the person")
    email = Column(String, unique=True, nullable=True, index=True, comment="Email address (optional)")
    role = Column(String, nullable=True, comment="Role in hospital (e.g., Doctor, Nurse, Patient)")
    status = Column(
        Enum(UserStatus),
        default=UserStatus.active,
        nullable=False,
        comment="User status (active/inactive)"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="Account creation timestamp"
    )

    # Relationships
    tags = relationship("Tag", back_populates="assigned_user", cascade="all")

    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', status='{self.status}')>"
