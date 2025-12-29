"""Add email configuration to organization settings

Revision ID: 012
Revises: 011
Create Date: 2025-12-29

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'  # depends on password reset tokens migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email configuration columns to organization_settings table
    op.add_column('organization_settings', sa.Column('smtp_host', sa.String(), nullable=True))
    op.add_column('organization_settings', sa.Column('smtp_port', sa.Integer(), nullable=True))
    op.add_column('organization_settings', sa.Column('smtp_username', sa.String(), nullable=True))
    op.add_column('organization_settings', sa.Column('smtp_password', sa.String(), nullable=True))
    op.add_column('organization_settings', sa.Column('smtp_from_email', sa.String(), nullable=True))
    op.add_column('organization_settings', sa.Column('smtp_from_name', sa.String(), nullable=True))

    # Set default values for existing records
    op.execute("""
        UPDATE organization_settings
        SET
            smtp_host = 'smtp.gmail.com',
            smtp_port = 587,
            smtp_from_name = 'RTLS System'
        WHERE smtp_host IS NULL
    """)


def downgrade() -> None:
    # Remove email configuration columns
    op.drop_column('organization_settings', 'smtp_from_name')
    op.drop_column('organization_settings', 'smtp_from_email')
    op.drop_column('organization_settings', 'smtp_password')
    op.drop_column('organization_settings', 'smtp_username')
    op.drop_column('organization_settings', 'smtp_port')
    op.drop_column('organization_settings', 'smtp_host')
