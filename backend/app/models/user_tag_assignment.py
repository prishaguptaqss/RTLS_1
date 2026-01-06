"""
UserTagAssignment model - tracks temporal assignment history of tags to users.
This enables user-wise location history preservation even after tag unassignment.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from app.database import Base


class UserTagAssignment(Base):
    """
    Tracks temporal assignment history of tags to users.

    Each row represents one assignment period:
    - assigned_at: When the tag was assigned to this user
    - unassigned_at: When the tag was unassigned (NULL if still assigned)

    This allows historical queries: "What was User X's location during period Y?"

    CRITICAL DESIGN:
    - Enables User A to keep ALL location history after tag unassignment
    - Enables User B to have clean slate when assigned same tag
    - Temporal join: location_history.entered_at BETWEEN assigned_at AND unassigned_at

    Example:
    - User A assigned Tag X at 10:00 -> (user_id=A, tag_id=X, assigned_at=10:00, unassigned_at=NULL)
    - User A unassigned Tag X at 12:00 -> (unassigned_at updated to 12:00)
    - User B assigned Tag X at 14:00 -> (new row: user_id=B, tag_id=X, assigned_at=14:00, unassigned_at=NULL)
    - Query User A history: shows locations from 10:00-12:00
    - Query User B history: shows locations from 14:00 onwards
    """
    __tablename__ = "user_tag_assignments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
        comment="Unique assignment record ID"
    )
    user_id = Column(
        String,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        comment="User that had the tag assigned"
    )
    tag_id = Column(
        String,
        ForeignKey("tags.tag_id", ondelete="CASCADE"),
        nullable=False,
        comment="Tag that was assigned to the user"
    )
    assigned_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Timestamp when tag was assigned to user"
    )
    unassigned_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when tag was unassigned (NULL if still assigned)"
    )

    # Composite indexes for efficient temporal queries
    __table_args__ = (
        # Index for temporal range queries: "Find assignments for user X at time Y"
        Index(
            'ix_user_tag_assignments_temporal',
            'user_id',
            'tag_id',
            'assigned_at',
            'unassigned_at'
        ),
        # Index for finding current assignments (where unassigned_at IS NULL)
        Index(
            'ix_user_tag_assignments_current',
            'user_id',
            'tag_id',
            'unassigned_at'
        ),
    )

    # Relationships
    user = relationship("User", back_populates="tag_assignments")
    tag = relationship("Tag", back_populates="user_assignments")

    def __repr__(self):
        status = "CURRENT" if self.unassigned_at is None else "HISTORICAL"
        return f"<UserTagAssignment(id={self.id}, user_id='{self.user_id}', tag_id='{self.tag_id}', assigned_at={self.assigned_at}, status={status})>"
