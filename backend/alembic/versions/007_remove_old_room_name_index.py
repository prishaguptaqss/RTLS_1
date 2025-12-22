"""remove_old_room_name_unique_index

Revision ID: 007_remove_old_index
Revises: 006_add_anchor_name
Create Date: 2025-12-22 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_remove_old_index'
down_revision: Union[str, None] = '006_add_anchor_name'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Remove the old unique index on room_name that was preventing
    rooms with the same name from existing in different organizations.

    The composite unique constraint (room_name, organization_id) already exists
    from migration 719c1808a82d, so we just need to remove the old global unique index.
    """
    # Drop the old unique index on room_name if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE indexname = 'ix_rooms_room_name'
                AND indexdef LIKE '%UNIQUE%'
            ) THEN
                DROP INDEX ix_rooms_room_name;
            END IF;
        END$$;
    """)

    # Recreate as a non-unique index for performance (optional but recommended)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE indexname = 'ix_rooms_room_name'
            ) THEN
                CREATE INDEX ix_rooms_room_name ON rooms(room_name);
            END IF;
        END$$;
    """)


def downgrade() -> None:
    """
    Recreate the old unique index on room_name.
    WARNING: This will fail if there are duplicate room names across organizations!
    """
    # Drop the non-unique index
    op.execute("DROP INDEX IF EXISTS ix_rooms_room_name;")

    # Recreate as unique index
    op.execute("CREATE UNIQUE INDEX ix_rooms_room_name ON rooms(room_name);")
