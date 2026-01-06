"""
EntityTagAssignment model - tracks temporal assignment history of tags to entities.
This enables entity-wise location history preservation even after tag unassignment.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from app.database import Base


class EntityTagAssignment(Base):
    """
    Tracks temporal assignment history of tags to entities.

    Each row represents one assignment period:
    - assigned_at: When the tag was assigned to this entity
    - unassigned_at: When the tag was unassigned (NULL if still assigned)

    This allows historical queries: "What was Entity X's location during period Y?"

    CRITICAL DESIGN:
    - Enables Entity A to keep ALL location history after tag unassignment
    - Enables Entity B to have clean slate when assigned same tag
    - Temporal join: location_history.entered_at BETWEEN assigned_at AND unassigned_at

    Example:
    - Entity A assigned Tag X at 10:00 -> (entity_id=A, tag_id=X, assigned_at=10:00, unassigned_at=NULL)
    - Entity A unassigned Tag X at 12:00 -> (unassigned_at updated to 12:00)
    - Entity B assigned Tag X at 14:00 -> (new row: entity_id=B, tag_id=X, assigned_at=14:00, unassigned_at=NULL)
    - Query Entity A history: shows locations from 10:00-12:00
    - Query Entity B history: shows locations from 14:00 onwards
    """
    __tablename__ = "entity_tag_assignments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
        comment="Unique assignment record ID"
    )
    entity_id = Column(
        Integer,
        ForeignKey("entities.id", ondelete="CASCADE"),
        nullable=False,
        comment="Entity that had the tag assigned"
    )
    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="CASCADE"),
        nullable=False,
        comment="Tag that was assigned to the entity"
    )
    assigned_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Timestamp when tag was assigned to entity"
    )
    unassigned_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when tag was unassigned (NULL if still assigned)"
    )

    # Composite indexes for efficient temporal queries
    __table_args__ = (
        # Index for temporal range queries: "Find assignments for entity X at time Y"
        Index(
            'ix_entity_tag_assignments_temporal',
            'entity_id',
            'tag_id',
            'assigned_at',
            'unassigned_at'
        ),
        # Index for finding current assignments (where unassigned_at IS NULL)
        Index(
            'ix_entity_tag_assignments_current',
            'entity_id',
            'tag_id',
            'unassigned_at'
        ),
    )

    # Relationships
    entity = relationship("Entity", back_populates="tag_assignments")
    tag = relationship("Tag", back_populates="entity_assignments")

    def __repr__(self):
        status = "CURRENT" if self.unassigned_at is None else "HISTORICAL"
        return f"<EntityTagAssignment(id={self.id}, entity_id={self.entity_id}, tag_id='{self.tag_id}', assigned_at={self.assigned_at}, status={status})>"
