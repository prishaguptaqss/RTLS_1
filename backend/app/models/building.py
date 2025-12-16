"""
Building model - represents physical buildings in the hospital complex.
"""
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Building(Base):
    """
    Building table - stores hospital buildings.

    A hospital can have multiple buildings (e.g., Main Hospital, Emergency Wing).
    """
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
        comment="Building name (e.g., 'Main Hospital', 'Emergency Wing')"
    )

    # Relationships
    # CASCADE delete: deleting a building deletes all its floors
    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Building(id={self.id}, name='{self.name}')>"
