"""Add logo column to organizations table

Revision ID: 013
Revises: 012
Create Date: 2025-12-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add logo column to organizations table
    op.add_column('organizations', sa.Column('logo', sa.String(), nullable=True, comment='Path to organization logo file'))


def downgrade() -> None:
    # Remove logo column from organizations table
    op.drop_column('organizations', 'logo')
