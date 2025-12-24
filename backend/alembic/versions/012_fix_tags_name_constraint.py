"""Fix tags name constraint to be unique per organization

Revision ID: 012_fix_tags_name
Revises: 011_add_password_reset
Create Date: 2025-12-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012_fix_tags_name'
down_revision = '011_add_password_reset'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old global unique index on name
    op.drop_index('ix_tags_name', table_name='tags')

    # Create a new unique constraint on (organization_id, name)
    # This makes name unique per organization instead of globally unique
    op.create_index(
        'ix_tags_org_name',
        'tags',
        ['organization_id', 'name'],
        unique=True
    )


def downgrade() -> None:
    # Drop the organization-scoped unique index
    op.drop_index('ix_tags_org_name', table_name='tags')

    # Recreate the old global unique index
    op.create_index('ix_tags_name', 'tags', ['name'], unique=True)
