"""add_missing_persons_table

Revision ID: 002
Revises: 001
Create Date: 2025-12-17

Adds missing_persons table to track individuals who haven't been detected for threshold duration (5+ minutes).
This table provides persistent tracking and historical audit trail of missing person incidents.

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create missing_persons table with:
    - Primary key (id)
    - Foreign keys to tags, users, patients, rooms
    - Check constraint ensuring tag assigned to user OR patient (not both)
    - Indexes for fast queries of unresolved missing persons
    """

    # Create missing_persons table
    op.create_table(
        'missing_persons',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tag_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('last_seen_room_id', sa.Integer(), nullable=True),
        sa.Column('reported_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('missing_duration_seconds', sa.Integer(), nullable=False),
        sa.Column('found_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('found_in_room_id', sa.Integer(), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), nullable=False, server_default='false'),

        # Primary key constraint
        sa.PrimaryKeyConstraint('id'),

        # Foreign key constraints
        sa.ForeignKeyConstraint(['tag_id'], ['tags.tag_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['last_seen_room_id'], ['rooms.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['found_in_room_id'], ['rooms.id'], ondelete='SET NULL'),

        # Check constraint: tag can only be assigned to user OR patient, not both
        sa.CheckConstraint('(user_id IS NULL OR patient_id IS NULL)', name='check_single_person_assignment')
    )

    # Create indexes for performance
    op.create_index('ix_missing_persons_tag_id', 'missing_persons', ['tag_id'], unique=False)
    op.create_index('ix_missing_persons_is_resolved', 'missing_persons', ['is_resolved'], unique=False)

    # Composite index for fast queries of unresolved missing persons (most common query)
    op.create_index('idx_unresolved_missing', 'missing_persons', ['is_resolved', 'reported_at'], unique=False)


def downgrade():
    """
    Remove missing_persons table and all associated indexes.
    """

    # Drop indexes first
    op.drop_index('idx_unresolved_missing', 'missing_persons')
    op.drop_index('ix_missing_persons_is_resolved', 'missing_persons')
    op.drop_index('ix_missing_persons_tag_id', 'missing_persons')

    # Drop table
    op.drop_table('missing_persons')
