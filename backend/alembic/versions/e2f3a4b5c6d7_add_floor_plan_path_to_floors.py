"""add_floor_plan_path_to_floors

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-01-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add floor_plan_path column to floors table."""
    op.add_column('floors', sa.Column('floor_plan_path', sa.String(), nullable=True,
                                      comment='Path to floor plan image file'))


def downgrade() -> None:
    """Remove floor_plan_path column from floors table."""
    op.drop_column('floors', 'floor_plan_path')
