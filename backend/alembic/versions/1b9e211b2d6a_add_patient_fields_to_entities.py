"""add_patient_fields_to_entities

Revision ID: 1b9e211b2d6a
Revises: 876027c8ba2e
Create Date: 2026-01-09 21:04:03.848540

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b9e211b2d6a'
down_revision: Union[str, None] = '876027c8ba2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to entities table
    op.add_column('entities', sa.Column('age', sa.Integer(), nullable=True, comment='Patient age'))
    op.add_column('entities', sa.Column('email', sa.String(), nullable=True, comment='Patient email address'))
    op.add_column('entities', sa.Column('phone', sa.String(), nullable=True, comment='Patient phone number'))

    # Add check constraint for age validation (0-150 years)
    op.create_check_constraint('check_age_range', 'entities', 'age >= 0 AND age <= 150')


def downgrade() -> None:
    # Remove check constraint
    op.drop_constraint('check_age_range', 'entities', type_='check')

    # Remove columns
    op.drop_column('entities', 'phone')
    op.drop_column('entities', 'email')
    op.drop_column('entities', 'age')
