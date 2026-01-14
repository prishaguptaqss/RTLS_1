"""Add history_retention_days to organization_settings

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-01-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e9f0a1b2c3'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add history_retention_days column to organization_settings table
    op.add_column('organization_settings', sa.Column('history_retention_days', sa.Integer(), nullable=False, server_default='1', comment='Number of days of history to show in recent history view'))


def downgrade() -> None:
    # Remove history_retention_days column from organization_settings table
    op.drop_column('organization_settings', 'history_retention_days')
