"""
Role model for RBAC system.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# Association table for many-to-many relationship between Role and Permission
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False),
)


class Role(Base):
    """
    Role model represents a collection of permissions.
    Roles can be assigned to staff members to grant them specific access rights.
    """

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    organization_id = Column(Integer, ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")
    staff_members = relationship("Staff", secondary="staff_roles", back_populates="roles")

    def __repr__(self):
        return f"<Role {self.name}>"
