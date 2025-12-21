"""add_name_to_tags

Revision ID: 002_add_name_to_tags
Revises: 7449f4b8efd1
Create Date: 2025-12-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_add_name_to_tags'
down_revision: Union[str, None] = '7449f4b8efd1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add name column to tags table
    op.add_column('tags', sa.Column('name', sa.String(), nullable=True, comment='Optional unique name for the tag'))

    # Create unique index on name column
    op.create_index(op.f('ix_tags_name'), 'tags', ['name'], unique=True)


def downgrade() -> None:
    # Drop the unique index
    op.drop_index(op.f('ix_tags_name'), table_name='tags')

    # Remove name column from tags table
    op.drop_column('tags', 'name')
