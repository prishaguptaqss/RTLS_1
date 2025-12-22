"""
Permission model for RBAC system.
"""

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Permission(Base):
    """
    Permission model represents a specific action or access right in the system.
    Permissions are assigned to roles, which are then assigned to staff members.
    """

    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    module = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Relationships
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

    def __repr__(self):
        return f"<Permission {self.code}>"
