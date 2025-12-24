"""remove_old_entity_id_unique_index

Revision ID: 009_remove_old_entity_index
Revises: 008_add_org_to_live_locations
Create Date: 2025-12-22 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_remove_old_entity_id_index'
down_revision: Union[str, None] = '008_add_org_to_live_locations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Remove the old unique index on entity_id that was preventing
    entities with the same entity_id from existing in different organizations.

    The composite unique constraint (entity_id, organization_id) already exists
    from the entity model, so we just need to remove the old global unique index.
    """
    # Drop the old unique index on entity_id if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE indexname = 'ix_entities_entity_id'
                AND indexdef LIKE '%UNIQUE%'
            ) THEN
                DROP INDEX ix_entities_entity_id;
            END IF;
        END$$;
    """)

    # Recreate as a non-unique index for performance (optional but recommended)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE indexname = 'ix_entities_entity_id'
            ) THEN
                CREATE INDEX ix_entities_entity_id ON entities(entity_id);
            END IF;
        END$$;
    """)


def downgrade() -> None:
    """
    Recreate the old unique index on entity_id.
    WARNING: This will fail if there are duplicate entity_id values across organizations!
    """
    # Drop the non-unique index
    op.execute("DROP INDEX IF EXISTS ix_entities_entity_id;")

    # Recreate as unique index
    op.execute("CREATE UNIQUE INDEX ix_entities_entity_id ON entities(entity_id);")
