"""add_organization_id_to_live_locations

Revision ID: 008_add_org_to_live_locations
Revises: 007_remove_old_index
Create Date: 2025-12-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_add_org_to_live_locations'
down_revision: Union[str, None] = '007_remove_old_index'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add organization_id to live_locations table for better query performance
    and consistent organization isolation.

    The organization_id is derived from the tag's organization.
    """
    # Step 1: Add organization_id column as nullable first
    op.add_column('live_locations',
                  sa.Column('organization_id', sa.Integer(), nullable=True))

    # Step 2: Populate organization_id from tags table
    op.execute("""
        UPDATE live_locations
        SET organization_id = tags.organization_id
        FROM tags
        WHERE live_locations.tag_id = tags.tag_id
    """)

    # Step 3: Make organization_id non-nullable
    op.alter_column('live_locations', 'organization_id', nullable=False)

    # Step 4: Add foreign key constraint
    op.create_foreign_key(
        'live_locations_organization_id_fkey',
        'live_locations',
        'organizations',
        ['organization_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Step 5: Add index for fast filtering by organization
    op.create_index(
        op.f('ix_live_locations_organization_id'),
        'live_locations',
        ['organization_id'],
        unique=False
    )


def downgrade() -> None:
    """
    Remove organization_id from live_locations table.
    """
    # Drop index
    op.drop_index(op.f('ix_live_locations_organization_id'), table_name='live_locations')

    # Drop foreign key
    op.drop_constraint('live_locations_organization_id_fkey', 'live_locations', type_='foreignkey')

    # Drop column
    op.drop_column('live_locations', 'organization_id')
