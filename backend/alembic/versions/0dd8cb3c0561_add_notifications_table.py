"""add_notifications_table

Revision ID: 0dd8cb3c0561
Revises: af863773e4f2
Create Date: 2026-01-08 11:34:30.597247

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0dd8cb3c0561'
down_revision: Union[str, None] = 'af863773e4f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notifications table using raw SQL to avoid enum recreation issues
    connection = op.get_bind()

    connection.execute(sa.text("""
        CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            type notificationtype NOT NULL DEFAULT 'MISSING_PERSON',
            tag_id VARCHAR REFERENCES tags(tag_id) ON DELETE SET NULL,
            entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
            entity_name VARCHAR,
            entity_type entitytype,
            user_id VARCHAR REFERENCES users(user_id) ON DELETE SET NULL,
            user_name VARCHAR,
            last_room VARCHAR,
            last_seen TIMESTAMP WITH TIME ZONE,
            missing_duration_seconds INTEGER,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            read_at TIMESTAMP WITH TIME ZONE,
            severity VARCHAR NOT NULL DEFAULT 'medium'
        )
    """))

    # Create indexes for query performance
    op.create_index('ix_notifications_organization_id', 'notifications', ['organization_id'])
    op.create_index('ix_notifications_type', 'notifications', ['type'])
    op.create_index('ix_notifications_tag_id', 'notifications', ['tag_id'])
    op.create_index('ix_notifications_entity_id', 'notifications', ['entity_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_entity_id', table_name='notifications')
    op.drop_index('ix_notifications_tag_id', table_name='notifications')
    op.drop_index('ix_notifications_type', table_name='notifications')
    op.drop_index('ix_notifications_organization_id', table_name='notifications')

    # Drop table
    op.drop_table('notifications')

    # Drop enum type
    connection = op.get_bind()
    connection.execute(sa.text("COMMIT"))
    try:
        connection.execute(sa.text("DROP TYPE IF EXISTS notificationtype"))
    except Exception as e:
        print(f"Note: Could not drop notificationtype enum: {e}")
