"""add_untracked_tags_table

Revision ID: 002
Revises: 001
Create Date: 2025-12-17

Add untracked_tags table to track missing/lost tags.

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create untracked_tags table for tracking missing tags.
    """
    op.create_table(
        'untracked_tags',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False, comment='Primary key'),
        sa.Column('tag_id', sa.String(), nullable=False, comment='BLE MAC address of the lost tag'),
        sa.Column('user_id', sa.String(), nullable=True, comment='User who was assigned this tag (nullable)'),
        sa.Column('user_name', sa.String(), nullable=True, comment='Cached user name for display (denormalized for performance)'),
        sa.Column('last_room_id', sa.Integer(), nullable=True, comment='Last known room where tag was seen'),
        sa.Column('last_room_name', sa.String(), nullable=True, comment='Cached room name for display (denormalized for performance)'),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False, comment='Last time the tag was detected before going offline'),
        sa.Column('marked_untracked_at', sa.DateTime(timezone=True), nullable=False, comment='When the tag was marked as untracked/lost'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.tag_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['last_room_id'], ['rooms.id'], ondelete='SET NULL')
    )

    # Create index on tag_id for faster lookups
    op.create_index('ix_untracked_tags_tag_id', 'untracked_tags', ['tag_id'], unique=False)

    # Create index on marked_untracked_at for sorting by most recent
    op.create_index('ix_untracked_tags_marked_untracked_at', 'untracked_tags', ['marked_untracked_at'], unique=False)


def downgrade():
    """
    Drop untracked_tags table.
    """
    op.drop_index('ix_untracked_tags_marked_untracked_at', table_name='untracked_tags')
    op.drop_index('ix_untracked_tags_tag_id', table_name='untracked_tags')
    op.drop_table('untracked_tags')
