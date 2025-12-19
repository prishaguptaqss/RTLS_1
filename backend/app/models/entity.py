"""
Entity model for RTLS system - replaces Patient model.
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.enums import EntityType


class Entity(Base):
    """Entity model for tracking persons and materials."""
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="Internal database ID")
    entity_id = Column(String, unique=True, nullable=False, index=True, comment="User-provided alphanumeric ID")
    type = Column(SQLEnum(EntityType), nullable=False, comment="Entity type: person or material")
    name = Column(String, nullable=True, comment="Optional entity name")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tags = relationship("Tag", back_populates="assigned_entity")
