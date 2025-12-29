"""Merge multiple migration heads

Revision ID: 014
Revises: 002, 013
Create Date: 2025-12-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '014'
down_revision = ('002', '013')  # Merge both heads
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration - no operations needed
    pass


def downgrade() -> None:
    # This is a merge migration - no operations needed
    pass
