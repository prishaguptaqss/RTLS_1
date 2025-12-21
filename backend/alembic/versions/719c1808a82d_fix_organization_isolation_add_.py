"""fix_organization_isolation_add_constraints

Revision ID: 719c1808a82d
Revises: 005_org_settings
Create Date: 2025-12-19 16:55:31.348570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '719c1808a82d'
down_revision: Union[str, None] = '005_org_settings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Fix organization isolation:
    1. Remove global unique constraint on buildings.name
    2. Add composite unique constraint (name, organization_id) for buildings
    3. Add organization_id column to rooms
    4. Remove global unique constraint on rooms.room_name
    5. Add composite unique constraint (room_name, organization_id) for rooms
    """

    # Step 1 & 2: Drop existing unique constraint and add composite constraint for buildings
    # Use raw SQL to handle potential missing constraints gracefully
    op.execute("""
        DO $$
        BEGIN
            -- Drop old constraint if it exists
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'buildings_name_key') THEN
                ALTER TABLE buildings DROP CONSTRAINT buildings_name_key;
            END IF;

            -- Add new composite constraint if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_building_name_org') THEN
                ALTER TABLE buildings ADD CONSTRAINT uq_building_name_org UNIQUE (name, organization_id);
            END IF;
        END$$;
    """)

    # Step 3: Add organization_id column to rooms
    # First, add the column as nullable
    op.add_column('rooms', sa.Column('organization_id', sa.Integer(), nullable=True))

    # Step 4: Populate organization_id in rooms from their floor->building->organization relationship
    op.execute("""
        UPDATE rooms
        SET organization_id = buildings.organization_id
        FROM floors
        JOIN buildings ON floors.building_id = buildings.id
        WHERE rooms.floor_id = floors.id
    """)

    # Step 5: Make organization_id non-nullable and add foreign key
    op.alter_column('rooms', 'organization_id', nullable=False)
    op.create_foreign_key('rooms_organization_id_fkey', 'rooms', 'organizations',
                         ['organization_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_rooms_organization_id'), 'rooms', ['organization_id'], unique=False)

    # Step 6 & 7: Drop existing unique constraint and add composite constraint for rooms
    op.execute("""
        DO $$
        BEGIN
            -- Drop old constraint if it exists
            IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rooms_room_name_key') THEN
                ALTER TABLE rooms DROP CONSTRAINT rooms_room_name_key;
            END IF;

            -- Add new composite constraint if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_room_name_org') THEN
                ALTER TABLE rooms ADD CONSTRAINT uq_room_name_org UNIQUE (room_name, organization_id);
            END IF;
        END$$;
    """)


def downgrade() -> None:
    """
    Reverse the organization isolation changes.
    WARNING: This will fail if there are duplicate names across organizations!
    """

    # Remove composite constraint from rooms
    op.drop_constraint('uq_room_name_org', 'rooms', type_='unique')

    # Add back global unique constraint on rooms.room_name
    op.create_unique_constraint('rooms_room_name_key', 'rooms', ['room_name'])

    # Remove organization_id from rooms
    op.drop_index(op.f('ix_rooms_organization_id'), table_name='rooms')
    op.drop_constraint('rooms_organization_id_fkey', 'rooms', type_='foreignkey')
    op.drop_column('rooms', 'organization_id')

    # Remove composite constraint from buildings
    op.drop_constraint('uq_building_name_org', 'buildings', type_='unique')

    # Add back global unique constraint on buildings.name
    op.create_unique_constraint('buildings_name_key', 'buildings', ['name'])
