"""
Floor model - represents floors within buildings.
"""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Floor(Base):
    """
    Floor table - stores floors within buildings.

    Each floor belongs to exactly one building.
    Floor numbers must be unique within a building.
    """
    __tablename__ = "floors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    building_id = Column(
        Integer,
        ForeignKey("buildings.id", ondelete="CASCADE"),
        nullable=False,
        comment="Foreign key to buildings table"
    )
    floor_number = Column(
        Integer,
        nullable=False,
        comment="Floor number (e.g., 1, 2, 3)"
    )

    # Unique constraint: same floor number cannot exist twice in same building
    __table_args__ = (
        UniqueConstraint('building_id', 'floor_number', name='uq_building_floor'),
    )

    # Relationships
    building = relationship("Building", back_populates="floors")
    # CASCADE delete: deleting a floor deletes all its rooms
    rooms = relationship("Room", back_populates="floor", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Floor(id={self.id}, building_id={self.building_id}, floor_number={self.floor_number})>"
