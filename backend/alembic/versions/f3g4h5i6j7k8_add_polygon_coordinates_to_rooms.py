"""add polygon coordinates to rooms

Revision ID: f3g4h5i6j7k8
Revises: e2f3a4b5c6d7
Create Date: 2026-01-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = 'f3g4h5i6j7k8'
down_revision = 'e2f3a4b5c6d7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add polygon_coordinates column to rooms table."""
    op.add_column('rooms', sa.Column('polygon_coordinates', JSON, nullable=True,
                                      comment='Polygon coordinates as array of {x, y} points for room boundary on floor plan'))


def downgrade() -> None:
    """Remove polygon_coordinates column from rooms table."""
    op.drop_column('rooms', 'polygon_coordinates')
