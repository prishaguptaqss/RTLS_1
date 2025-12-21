"""Add organization_settings table

Revision ID: 005_org_settings
Revises: 004_org_scoping
Create Date: 2025-12-19 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_org_settings'
down_revision = '004_org_scoping'
branch_labels = None
depends_on = None


def upgrade():
    # Create organization_settings table
    op.create_table(
        'organization_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('untracked_threshold_seconds', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', name='uq_organization_settings_org_id')
    )
    op.create_index('ix_organization_settings_organization_id', 'organization_settings', ['organization_id'])

    # Create default settings for existing organizations
    op.execute("""
        INSERT INTO organization_settings (organization_id, untracked_threshold_seconds)
        SELECT id, 30 FROM organizations
    """)


def downgrade():
    op.drop_index('ix_organization_settings_organization_id', table_name='organization_settings')
    op.drop_table('organization_settings')
