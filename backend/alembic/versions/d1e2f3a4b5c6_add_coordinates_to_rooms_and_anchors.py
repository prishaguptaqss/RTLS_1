"""add_coordinates_to_rooms_and_anchors

Revision ID: d1e2f3a4b5c6
Revises: 876027c8ba2e
Create Date: 2026-01-11 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = '6805a93e3894'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add x_coordinate and y_coordinate columns to rooms and anchors tables."""
    # Add coordinate columns to rooms table
    op.add_column('rooms', sa.Column('x_coordinate', sa.Float(), nullable=True,
                                      comment='X coordinate for map visualization (in logical units or pixels)'))
    op.add_column('rooms', sa.Column('y_coordinate', sa.Float(), nullable=True,
                                      comment='Y coordinate for map visualization (in logical units or pixels)'))

    # Add coordinate columns to anchors table
    op.add_column('anchors', sa.Column('x_coordinate', sa.Float(), nullable=True,
                                        comment='X coordinate for map visualization (relative to room or floor)'))
    op.add_column('anchors', sa.Column('y_coordinate', sa.Float(), nullable=True,
                                        comment='Y coordinate for map visualization (relative to room or floor)'))


def downgrade() -> None:
    """Remove x_coordinate and y_coordinate columns from rooms and anchors tables."""
    # Remove coordinate columns from anchors table
    op.drop_column('anchors', 'y_coordinate')
    op.drop_column('anchors', 'x_coordinate')

    # Remove coordinate columns from rooms table
    op.drop_column('rooms', 'y_coordinate')
    op.drop_column('rooms', 'x_coordinate')
