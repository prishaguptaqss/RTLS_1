"""update_anchor_status_enum

Revision ID: a48d1fbb563b
Revises: a1b2c3d4e5f6
Create Date: 2026-01-06 19:16:32.481742

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a48d1fbb563b'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new enum values to anchorstatus type
    # Note: ALTER TYPE ADD VALUE cannot run inside a transaction block in PostgreSQL
    # We use IF NOT EXISTS to make this migration idempotent

    connection = op.get_bind()

    # We need to execute ALTER TYPE outside of a transaction
    # First, commit the current transaction
    connection.execute(sa.text("COMMIT"))

    # Add new enum values (PostgreSQL 9.1+)
    # Using IF NOT EXISTS (PostgreSQL 9.6+) to make it idempotent
    try:
        connection.execute(sa.text("ALTER TYPE anchorstatus ADD VALUE IF NOT EXISTS 'inactive_defective'"))
    except Exception as e:
        print(f"Note: Could not add inactive_defective (may already exist): {e}")

    try:
        connection.execute(sa.text("ALTER TYPE anchorstatus ADD VALUE IF NOT EXISTS 'inactive_in_store'"))
    except Exception as e:
        print(f"Note: Could not add inactive_in_store (may already exist): {e}")

    # Begin a new transaction for data migration
    connection.execute(sa.text("BEGIN"))

    # Migrate existing data
    # Convert all 'offline' to 'inactive_in_store'
    op.execute("UPDATE anchors SET status = 'inactive_in_store' WHERE status = 'offline'")

    # Convert unassigned active anchors to 'inactive_in_store'
    op.execute("UPDATE anchors SET status = 'inactive_in_store' WHERE room_id IS NULL AND status = 'active'")


def downgrade() -> None:
    # Revert data migrations
    op.execute("UPDATE anchors SET status = 'offline' WHERE status IN ('inactive_defective', 'inactive_in_store')")

    # Note: PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum type if you want to remove values
    # For now, we'll leave the enum values in place as they don't cause issues
