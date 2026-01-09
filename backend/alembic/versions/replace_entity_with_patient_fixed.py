"""Replace Entity with Patient - Fixed

Revision ID: replace_entity_patient_v2
Revises: 0dd8cb3c0561
Create Date: 2026-01-09

IMPORTANT: Backup your database before running this migration!
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'replace_entity_patient_v2'
down_revision = '0dd8cb3c0561'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Transform entity system to patient system
    """

    # Step 1: Add new patient columns
    op.add_column('entities', sa.Column('patient_age', sa.Integer(), nullable=True))
    op.add_column('entities', sa.Column('patient_email', sa.String(), nullable=True))
    op.add_column('entities', sa.Column('patient_phone', sa.String(), nullable=True))

    # Step 2: Rename name column
    op.alter_column('entities', 'name', new_column_name='patient_name')

    # Set default for NULL names
    op.execute("UPDATE entities SET patient_name = entity_id WHERE patient_name IS NULL")
    op.alter_column('entities', 'patient_name', nullable=False)

    # Step 3: Drop type column
    op.drop_column('entities', 'type')

    # Step 4: Make entity_id globally unique by adding org suffix for duplicates
    op.execute("""
        UPDATE entities e1
        SET entity_id = entity_id || '_ORG' || organization_id::TEXT
        WHERE EXISTS (
            SELECT 1 FROM entities e2
            WHERE e2.entity_id = e1.entity_id
            AND e2.id != e1.id
        )
    """)

    # Create temp mapping table
    op.execute("CREATE TEMPORARY TABLE entity_id_map AS SELECT id, entity_id FROM entities")

    # Step 5: Drop foreign key constraints first
    op.drop_constraint('entity_tag_assignments_entity_id_fkey', 'entity_tag_assignments', type_='foreignkey')
    op.drop_constraint('tags_assigned_entity_id_fkey', 'tags', type_='foreignkey')
    op.drop_constraint('notifications_entity_id_fkey', 'notifications', type_='foreignkey')

    # Step 6: Change column types to VARCHAR
    op.execute("ALTER TABLE entity_tag_assignments ALTER COLUMN entity_id TYPE VARCHAR USING entity_id::VARCHAR")
    op.execute("ALTER TABLE tags ALTER COLUMN assigned_entity_id TYPE VARCHAR USING assigned_entity_id::VARCHAR")
    op.execute("ALTER TABLE notifications ALTER COLUMN entity_id TYPE VARCHAR USING entity_id::VARCHAR")

    # Step 7: Update FK references to use entity_id string
    op.execute("""
        UPDATE entity_tag_assignments eta
        SET entity_id = (SELECT entity_id FROM entity_id_map WHERE id = CAST(eta.entity_id AS INTEGER))
    """)

    op.execute("""
        UPDATE tags
        SET assigned_entity_id = (SELECT entity_id FROM entity_id_map WHERE id = CAST(tags.assigned_entity_id AS INTEGER))
        WHERE assigned_entity_id IS NOT NULL
    """)

    op.execute("""
        UPDATE notifications
        SET entity_id = (SELECT entity_id FROM entity_id_map WHERE id = CAST(notifications.entity_id AS INTEGER))
        WHERE entity_id IS NOT NULL
    """)

    # Step 8: Drop constraints
    op.drop_constraint('uq_entity_id_org', 'entities', type_='unique')
    op.drop_constraint('entities_pkey', 'entities', type_='primary')
    op.drop_column('entities', 'id')

    # Step 9: Rename entity_id to patient_id
    op.alter_column('entities', 'entity_id', new_column_name='patient_id')

    # Step 10: Make patient_id the primary key (now globally unique)
    op.create_primary_key('patients_pkey', 'entities', ['patient_id'])
    op.create_unique_constraint('uq_patient_id_org', 'entities', ['patient_id', 'organization_id'])

    # Step 11: Rename tables
    op.rename_table('entities', 'patients')
    op.rename_table('entity_tag_assignments', 'patient_tag_assignments')

    # Step 12: Update patient_tag_assignments
    op.alter_column('patient_tag_assignments', 'entity_id', new_column_name='patient_id')

    # Convert id to string
    op.execute("""
        ALTER TABLE patient_tag_assignments
        ALTER COLUMN id TYPE VARCHAR
        USING patient_id || '_' || tag_id || '_' || EXTRACT(EPOCH FROM assigned_at)::TEXT
    """)

    # Step 13: Recreate FKs
    op.create_foreign_key(
        'patient_tag_assignments_patient_id_fkey',
        'patient_tag_assignments', 'patients',
        ['patient_id'], ['patient_id'],
        ondelete='CASCADE'
    )

    # Step 14: Update tags table
    op.alter_column('tags', 'assigned_entity_id', new_column_name='assigned_patient_id')
    op.create_foreign_key(
        'tags_assigned_patient_id_fkey',
        'tags', 'patients',
        ['assigned_patient_id'], ['patient_id'],
        ondelete='SET NULL'
    )

    op.drop_constraint('check_single_assignment', 'tags', type_='check')
    op.create_check_constraint(
        'check_single_assignment',
        'tags',
        '(assigned_user_id IS NULL OR assigned_patient_id IS NULL)'
    )

    # Step 15: Update notifications
    op.alter_column('notifications', 'entity_id', new_column_name='patient_id')
    op.alter_column('notifications', 'entity_name', new_column_name='patient_name')
    op.drop_column('notifications', 'entity_type')

    op.create_foreign_key(
        'notifications_patient_id_fkey',
        'notifications', 'patients',
        ['patient_id'], ['patient_id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade not implemented - restore from backup instead"""
    raise NotImplementedError("Downgrade not implemented")
