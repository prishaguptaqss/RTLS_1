"""merge_heads

Revision ID: 5b0dbe65c0bb
Revises: d8e9f0a1b2c3, f3g4h5i6j7k8
Create Date: 2026-01-16 10:24:16.295996

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b0dbe65c0bb'
down_revision: Union[str, None] = ('d8e9f0a1b2c3', 'f3g4h5i6j7k8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
