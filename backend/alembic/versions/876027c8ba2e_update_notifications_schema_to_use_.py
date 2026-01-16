"""update_notifications_schema_to_use_entities

Revision ID: 876027c8ba2e
Revises: 0dd8cb3c0561
Create Date: 2026-01-09 18:55:25.055022

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '876027c8ba2e'
down_revision: Union[str, None] = '0dd8cb3c0561'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Migrate notifications table from patient_id/patient_name to entity_id/entity_name/entity_type."""
    # Check if columns already exist before adding (for idempotency)
    connection = op.get_bind()

    # Check and add entity_id column if it doesn't exist
    result = connection.execute(sa.text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='notifications' AND column_name='entity_id'
    """))
    if not result.fetchone():
        op.add_column('notifications', sa.Column('entity_id', sa.Integer(), nullable=True))

    # Check and add entity_name column if it doesn't exist
    result = connection.execute(sa.text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='notifications' AND column_name='entity_name'
    """))
    if not result.fetchone():
        op.add_column('notifications', sa.Column('entity_name', sa.String(), nullable=True))

    # Check and add entity_type column if it doesn't exist
    result = connection.execute(sa.text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='notifications' AND column_name='entity_type'
    """))
    if not result.fetchone():
        op.execute("ALTER TABLE notifications ADD COLUMN entity_type entitytype")

    # Migrate data from patient columns to entity columns (only if patient_name column exists)
    result = connection.execute(sa.text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='notifications' AND column_name='patient_name'
    """))
    if result.fetchone():
        op.execute("""
            UPDATE notifications
            SET entity_name = patient_name
            WHERE patient_name IS NOT NULL
        """)

    # Create foreign key constraint for entity_id if it doesn't exist
    result = connection.execute(sa.text("""
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name='notifications' AND constraint_name='fk_notifications_entity_id'
    """))
    if not result.fetchone():
        op.create_foreign_key(
            'fk_notifications_entity_id',
            'notifications', 'entities',
            ['entity_id'], ['id'],
            ondelete='SET NULL'
        )

    # Drop old patient columns if they exist
    result = connection.execute(sa.text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='notifications' AND column_name='patient_name'
    """))
    if result.fetchone():
        op.drop_column('notifications', 'patient_name')

    result = connection.execute(sa.text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='notifications' AND column_name='patient_id'
    """))
    if result.fetchone():
        op.drop_column('notifications', 'patient_id')


def downgrade() -> None:
    """Rollback entity columns to patient columns."""
    # Add back patient columns
    op.add_column('notifications', sa.Column('patient_id', sa.String(), nullable=True))
    op.add_column('notifications', sa.Column('patient_name', sa.String(), nullable=True))

    # Migrate data back
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE notifications
        SET patient_name = entity_name
        WHERE entity_name IS NOT NULL;
    """))

    # Drop entity columns
    op.drop_constraint('fk_notifications_entity_id', 'notifications', type_='foreignkey')
    op.drop_index('ix_notifications_entity_id', table_name='notifications')
    op.drop_column('notifications', 'entity_type')
    op.drop_column('notifications', 'entity_name')
    op.drop_column('notifications', 'entity_id')
