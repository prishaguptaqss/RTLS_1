"""
Entity model for RTLS system - replaces Patient model.
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.enums import EntityType


class Entity(Base):
    """Entity model for tracking persons and materials."""
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="Internal database ID")
    entity_id = Column(String, nullable=False, index=True, comment="User-provided alphanumeric ID")
    organization_id = Column(Integer, ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, comment="Organization this entity belongs to")
    type = Column(SQLEnum(EntityType), nullable=False, comment="Entity type: person or material")
    name = Column(String, nullable=True, comment="Optional entity name")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite unique constraint: entity_id must be unique within organization
    __table_args__ = (
        UniqueConstraint('entity_id', 'organization_id', name='uq_entity_id_org'),
    )

    # Relationships
    organization = relationship("Organization", back_populates="entities")
    tags = relationship("Tag", back_populates="assigned_entity")
