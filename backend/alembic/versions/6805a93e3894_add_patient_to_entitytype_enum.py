"""add_patient_to_entitytype_enum

Revision ID: 6805a93e3894
Revises: 1b9e211b2d6a
Create Date: 2026-01-09 21:14:08.360939

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6805a93e3894'
down_revision: Union[str, None] = '1b9e211b2d6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'patient' to the entitytype enum
    # PostgreSQL requires a specific syntax for altering enums
    op.execute("ALTER TYPE entitytype ADD VALUE IF NOT EXISTS 'patient' BEFORE 'person'")


def downgrade() -> None:
    # Note: PostgreSQL does not support removing enum values
    # This would require recreating the enum type and all dependent objects
    # For safety, we'll leave the enum value in place
    pass
