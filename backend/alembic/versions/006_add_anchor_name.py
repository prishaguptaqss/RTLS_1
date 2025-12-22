"""add_anchor_name_field

Revision ID: 006_add_anchor_name
Revises: 719c1808a82d
Create Date: 2025-12-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_add_anchor_name'
down_revision: Union[str, None] = '719c1808a82d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add anchor_name field to anchors table.
    This is an optional field that can be used to give anchors human-readable names.
    anchor_name can be common across organizations, but anchor_id is unique.
    """
    op.add_column('anchors', sa.Column('anchor_name', sa.String(), nullable=True, comment='Optional human-readable name for the anchor (can be common across organizations)'))


def downgrade() -> None:
    """
    Remove anchor_name field from anchors table.
    """
    op.drop_column('anchors', 'anchor_name')
