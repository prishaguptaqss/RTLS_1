"""transform_to_entities_and_organizations

Revision ID: 003_entities_orgs
Revises: 002_add_name_to_tags
Create Date: 2025-12-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003_entities_orgs'
down_revision: Union[str, None] = '002_add_name_to_tags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ====================
    # STEP 1: DELETE EXISTING DATA AND CLEAN UP
    # ====================
    # WARNING: This will permanently delete all existing data
    print("Deleting existing location history...")
    op.execute("DELETE FROM location_history;")

    print("Deleting existing live locations...")
    op.execute("DELETE FROM live_locations;")

    print("Unassigning all tags...")
    op.execute("UPDATE tags SET assigned_patient_id = NULL WHERE assigned_patient_id IS NOT NULL;")

    print("Deleting all patients...")
    op.execute("DELETE FROM patients;")

    print("Deleting all rooms...")
    op.execute("DELETE FROM rooms;")

    print("Deleting all floors...")
    op.execute("DELETE FROM floors;")

    print("Deleting all buildings...")
    op.execute("DELETE FROM buildings;")

    print("Dropping any existing entities and organizations tables from partial migrations...")
    op.execute("DROP TABLE IF EXISTS entities CASCADE;")
    op.execute("DROP TABLE IF EXISTS organizations CASCADE;")
    op.execute("DROP TYPE IF EXISTS entitytype CASCADE;")

    # ====================
    # STEP 2: CREATE ORGANIZATIONS TABLE
    # ====================
    print("Creating organizations table...")
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('org_id', sa.String(), nullable=False, comment='User-provided organization ID'),
        sa.Column('name', sa.String(), nullable=False, comment='Organization name'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id')
    )
    op.create_index(op.f('ix_organizations_org_id'), 'organizations', ['org_id'], unique=True)

    # ====================
    # STEP 3: ADD ORGANIZATION_ID TO BUILDINGS
    # ====================
    print("Adding organization_id to buildings table...")
    op.add_column('buildings', sa.Column('organization_id', sa.Integer(), nullable=True))

    # Note: Making it nullable temporarily, will make it non-nullable after migration completes
    # In production, you would first create a default organization and assign all buildings to it
    # But since we deleted all buildings, we can make it non-nullable right away
    op.alter_column('buildings', 'organization_id', nullable=False)

    op.create_foreign_key(
        'fk_buildings_organization_id',
        'buildings', 'organizations',
        ['organization_id'], ['id'],
        ondelete='CASCADE'
    )

    # ====================
    # STEP 4: CREATE ENTITIES TABLE (REPLACES PATIENTS)
    # ====================
    print("Creating entities table...")

    # EntityType enum will be automatically created by SQLAlchemy when creating the table
    # No need to manually create it here

    op.create_table(
        'entities',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('entity_id', sa.String(), nullable=False, comment='User-provided alphanumeric ID'),
        sa.Column('type', postgresql.ENUM('person', 'material', name='entitytype', create_type=True), nullable=False, comment='Entity type: person or material'),
        sa.Column('name', sa.String(), nullable=True, comment='Optional entity name'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entity_id')
    )
    op.create_index(op.f('ix_entities_entity_id'), 'entities', ['entity_id'], unique=True)

    # ====================
    # STEP 5: MODIFY TAGS TABLE (PATIENT -> ENTITY)
    # ====================
    print("Updating tags table...")

    # Drop the old check constraint
    op.drop_constraint('check_single_assignment', 'tags', type_='check')

    # Drop foreign key to patients table
    op.drop_constraint('tags_assigned_patient_id_fkey', 'tags', type_='foreignkey')

    # Rename column
    op.alter_column('tags', 'assigned_patient_id', new_column_name='assigned_entity_id')

    # Create foreign key to entities table
    op.create_foreign_key(
        'fk_tags_assigned_entity_id',
        'tags', 'entities',
        ['assigned_entity_id'], ['id'],
        ondelete='SET NULL'
    )

    # Create new check constraint
    op.create_check_constraint(
        'check_single_assignment',
        'tags',
        '(assigned_user_id IS NULL OR assigned_entity_id IS NULL)'
    )

    # ====================
    # STEP 6: DROP PATIENTS TABLE
    # ====================
    print("Dropping patients table...")
    op.drop_table('patients')

    # ====================
    # STEP 7: DROP PATIENTSTATUS ENUM
    # ====================
    print("Dropping PatientStatus enum...")
    patientstatus_enum = postgresql.ENUM('admitted', 'discharged', name='patientstatus')
    patientstatus_enum.drop(op.get_bind(), checkfirst=True)

    print("Migration completed successfully!")


def downgrade() -> None:
    # ====================
    # REVERSE MIGRATION (NOT RECOMMENDED - DATA LOSS)
    # ====================
    print("WARNING: Downgrading will result in data loss!")

    # Recreate PatientStatus enum
    patientstatus_enum = postgresql.ENUM('admitted', 'discharged', name='patientstatus', create_type=True)
    patientstatus_enum.create(op.get_bind(), checkfirst=True)

    # Recreate patients table
    op.create_table(
        'patients',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('patient_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('mobile_number', sa.String(), nullable=True),
        sa.Column('admission_time', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('discharge_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('admitted', 'discharged', name='patientstatus'), server_default='admitted', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('patient_id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('mobile_number')
    )

    # Update tags table
    op.drop_constraint('check_single_assignment', 'tags', type_='check')
    op.drop_constraint('fk_tags_assigned_entity_id', 'tags', type_='foreignkey')
    op.alter_column('tags', 'assigned_entity_id', new_column_name='assigned_patient_id')
    op.create_foreign_key(
        'tags_assigned_patient_id_fkey',
        'tags', 'patients',
        ['assigned_patient_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_check_constraint(
        'check_single_assignment',
        'tags',
        '(assigned_user_id IS NULL OR assigned_patient_id IS NULL)'
    )

    # Drop entities table
    op.drop_index(op.f('ix_entities_entity_id'), table_name='entities')
    op.drop_table('entities')

    # Drop EntityType enum
    entitytype_enum = postgresql.ENUM('person', 'material', name='entitytype')
    entitytype_enum.drop(op.get_bind(), checkfirst=True)

    # Remove organization_id from buildings
    op.drop_constraint('fk_buildings_organization_id', 'buildings', type_='foreignkey')
    op.drop_column('buildings', 'organization_id')

    # Drop organizations table
    op.drop_index(op.f('ix_organizations_org_id'), table_name='organizations')
    op.drop_table('organizations')

    print("Downgrade completed (with data loss)!")
