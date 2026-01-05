"""Add mail signature fields to organization_settings

Revision ID: a1b2c3d4e5f6
Revises: 58638fb721c0
Create Date: 2026-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '58638fb721c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add mail signature configuration columns to organization_settings table
    op.add_column('organization_settings', sa.Column('mail_signature_text', sa.String(), nullable=True, comment='Custom email signature text'))
    op.add_column('organization_settings', sa.Column('mail_signature_logo', sa.String(), nullable=True, comment='Path to mail signature logo file'))
    op.add_column('organization_settings', sa.Column('organization_website', sa.String(), nullable=True, comment='Organization website URL'))
    op.add_column('organization_settings', sa.Column('organization_phone', sa.String(), nullable=True, comment='Organization phone number'))
    op.add_column('organization_settings', sa.Column('organization_address_line', sa.String(), nullable=True, comment='Organization address for email footer'))
    op.add_column('organization_settings', sa.Column('social_links', sa.String(), nullable=True, comment='JSON string of social media links'))


def downgrade() -> None:
    # Remove mail signature configuration columns from organization_settings table
    op.drop_column('organization_settings', 'social_links')
    op.drop_column('organization_settings', 'organization_address_line')
    op.drop_column('organization_settings', 'organization_phone')
    op.drop_column('organization_settings', 'organization_website')
    op.drop_column('organization_settings', 'mail_signature_logo')
    op.drop_column('organization_settings', 'mail_signature_text')
