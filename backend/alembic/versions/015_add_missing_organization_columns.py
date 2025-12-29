"""Add missing columns to organizations table

Revision ID: 015
Revises: 013
Create Date: 2025-12-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '015'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to organizations table
    op.add_column('organizations', sa.Column('display_name', sa.String(7), nullable=True, comment='Short display name (max 7 characters)'))
    op.add_column('organizations', sa.Column('address', sa.String(), nullable=True, comment='Organization address'))
    op.add_column('organizations', sa.Column('country', sa.String(), nullable=True, comment='Country'))
    op.add_column('organizations', sa.Column('pincode', sa.String(), nullable=True, comment='Postal/PIN code'))

    # Set default values for existing records
    op.execute("""
        UPDATE organizations
        SET
            display_name = LEFT(name, 7),
            address = 'Not specified',
            country = 'Not specified',
            pincode = '000000'
        WHERE display_name IS NULL
    """)

    # Make columns non-nullable after setting default values
    op.alter_column('organizations', 'display_name', nullable=False)
    op.alter_column('organizations', 'address', nullable=False)
    op.alter_column('organizations', 'country', nullable=False)
    op.alter_column('organizations', 'pincode', nullable=False)


def downgrade() -> None:
    # Remove the added columns
    op.drop_column('organizations', 'pincode')
    op.drop_column('organizations', 'country')
    op.drop_column('organizations', 'address')
    op.drop_column('organizations', 'display_name')
