"""
Staff model for authenticated users with RBAC.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# Association table for many-to-many relationship between Staff and Role
staff_roles = Table(
    'staff_roles',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('staff_id', Integer, ForeignKey('staff.id', ondelete='CASCADE'), nullable=False),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
)


class Staff(Base):
    """
    Staff model represents authenticated users in the system.
    Separate from the legacy User model to maintain backward compatibility.
    """

    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, autoincrement=True)
    staff_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    organization_id = Column(Integer, ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="staff_members")
    roles = relationship("Role", secondary=staff_roles, back_populates="staff_members")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="staff", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Staff {self.staff_id} - {self.email}>"
