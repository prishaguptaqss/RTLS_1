"""
Building model - represents physical buildings in an organization.
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Building(Base):
    """
    Building table - stores buildings within organizations.

    Each building belongs to one organization.
    """
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        comment="Organization this building belongs to"
    )
    name = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
        comment="Building name (e.g., 'Main Hospital', 'Emergency Wing')"
    )

    # Relationships
    organization = relationship("Organization", back_populates="buildings")
    # CASCADE delete: deleting a building deletes all its floors
    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Building(id={self.id}, name='{self.name}')>"
