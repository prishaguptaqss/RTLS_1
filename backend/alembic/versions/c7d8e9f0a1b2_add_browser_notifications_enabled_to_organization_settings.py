"""Add browser_notifications_enabled to organization_settings

Revision ID: c7d8e9f0a1b2
Revises: a1b2c3d4e5f6
Create Date: 2026-01-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add browser_notifications_enabled column to organization_settings table
    op.add_column('organization_settings', sa.Column('browser_notifications_enabled', sa.Boolean(), nullable=False, server_default='true', comment='Enable/disable browser push notifications'))


def downgrade() -> None:
    # Remove browser_notifications_enabled column from organization_settings table
    op.drop_column('organization_settings', 'browser_notifications_enabled')
