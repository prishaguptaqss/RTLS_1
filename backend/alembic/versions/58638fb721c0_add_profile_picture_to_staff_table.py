"""Add profile_picture to staff table

Revision ID: 58638fb721c0
Revises: 6a19ae95e3ab
Create Date: 2025-12-30 15:39:24.327549

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58638fb721c0'
down_revision: Union[str, None] = '6a19ae95e3ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add profile_picture column to staff table
    op.add_column('staff', sa.Column('profile_picture', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove profile_picture column from staff table
    op.drop_column('staff', 'profile_picture')
