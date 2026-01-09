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
    # Add new entity columns
    op.add_column('notifications', sa.Column('entity_id', sa.Integer(), nullable=True))
    op.add_column('notifications', sa.Column('entity_name', sa.String(), nullable=True))

    # Add entity_type column - the entitytype enum should already exist from entities table
    # Just add the column
    op.execute("ALTER TABLE notifications ADD COLUMN entity_type entitytype")

    # Migrate data from patient columns to entity columns
    op.execute("""
        UPDATE notifications
        SET entity_name = patient_name
        WHERE patient_name IS NOT NULL
    """)

    # Create foreign key constraint for entity_id
    op.create_foreign_key(
        'fk_notifications_entity_id',
        'notifications', 'entities',
        ['entity_id'], ['id'],
        ondelete='SET NULL'
    )

    # Drop old patient columns
    op.drop_column('notifications', 'patient_name')
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
