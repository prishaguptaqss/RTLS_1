"""
Building model - represents physical buildings in an organization.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Building(Base):
    """
    Building table - stores buildings within organizations.

    Each building belongs to one organization.
    Building names must be unique within an organization, but different organizations
    can have buildings with the same name.
    """
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Organization this building belongs to"
    )
    name = Column(
        String,
        nullable=False,
        index=True,
        comment="Building name (e.g., 'Main Hospital', 'Emergency Wing')"
    )

    # Composite unique constraint: building name must be unique within organization
    __table_args__ = (
        UniqueConstraint('name', 'organization_id', name='uq_building_name_org'),
    )

    # Relationships
    organization = relationship("Organization", back_populates="buildings")
    # CASCADE delete: deleting a building deletes all its floors
    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Building(id={self.id}, name='{self.name}', org_id={self.organization_id})>"
