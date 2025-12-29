"""change_user_id_to_string

Revision ID: 001
Revises:
Create Date: 2025-12-17

BREAKING CHANGE: Migrates User.id from Integer to String (user_id)
All existing data will be deleted as confirmed by user.

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """
    Upgrade database schema:
    1. Drop foreign key constraints referencing users.id
    2. Truncate all tables (delete all data)
    3. Alter users table: drop id, add user_id as String PK
    4. Alter tags table: change assigned_user_id from Integer to String FK
    5. Recreate constraints and indexes
    """

    # Step 1: Drop foreign key constraints
    op.drop_constraint('tags_assigned_user_id_fkey', 'tags', type_='foreignkey')

    # Step 2: Truncate all data (confirmed with user - acceptable data loss)
    op.execute('TRUNCATE location_history, live_locations, tags, users CASCADE;')

    # Step 3: Alter users table
    # Drop old id column
    op.drop_column('users', 'id')

    # Add new user_id column as primary key
    op.add_column('users', sa.Column('user_id', sa.String(), nullable=False))
    op.create_primary_key('users_pkey', 'users', ['user_id'])
    op.create_index('ix_users_user_id', 'users', ['user_id'], unique=False)

    # Step 4: Alter tags table
    # Drop old assigned_user_id Integer column
    op.drop_column('tags', 'assigned_user_id')

    # Add new assigned_user_id String column
    op.add_column('tags', sa.Column('assigned_user_id', sa.String(), nullable=True))

    # Recreate foreign key constraint
    op.create_foreign_key(
        'tags_assigned_user_id_fkey',
        'tags', 'users',
        ['assigned_user_id'], ['user_id'],
        ondelete='SET NULL'
    )


def downgrade():
    """
    Downgrade database schema (reverses the upgrade)
    WARNING: This will also truncate data
    """

    # Drop new constraints
    op.drop_constraint('tags_assigned_user_id_fkey', 'tags', type_='foreignkey')

    # Truncate data again since we can't preserve it through schema change
    op.execute('TRUNCATE location_history, live_locations, tags, users CASCADE;')

    # Revert tags table
    op.drop_column('tags', 'assigned_user_id')
    op.add_column('tags', sa.Column('assigned_user_id', sa.Integer(), nullable=True))

    # Revert users table
    op.drop_index('ix_users_user_id', 'users')
    op.drop_constraint('users_pkey', 'users', type_='primary')
    op.drop_column('users', 'user_id')
    op.add_column('users', sa.Column('id', sa.Integer(), autoincrement=True, nullable=False))
    op.create_primary_key('users_pkey', 'users', ['id'])
    op.create_index('ix_users_id', 'users', ['id'], unique=False)

    # Recreate old foreign key
    op.create_foreign_key(
        'tags_assigned_user_id_fkey',
        'tags', 'users',
        ['assigned_user_id'], ['id'],
        ondelete='SET NULL'
    )
