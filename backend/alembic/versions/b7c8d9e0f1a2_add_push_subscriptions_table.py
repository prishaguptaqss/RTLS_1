"""add_push_subscriptions_table

Revision ID: b7c8d9e0f1a2
Revises: 876027c8ba2e
Create Date: 2026-01-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add push_subscriptions table for Web Push notifications."""
    # Create push_subscriptions table
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False, comment='Subscription ID'),
        sa.Column('staff_id', sa.Integer(), nullable=False, comment='Staff member ID'),
        sa.Column('organization_id', sa.Integer(), nullable=False, comment='Organization this subscription belongs to'),
        sa.Column('endpoint', sa.Text(), nullable=False, comment='Push service endpoint URL'),
        sa.Column('p256dh_key', sa.String(length=255), nullable=False, comment='P256DH public key for encryption'),
        sa.Column('auth_key', sa.String(length=255), nullable=False, comment='Auth secret for encryption'),
        sa.Column('user_agent', sa.String(length=500), nullable=True, comment='Browser user agent string'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Subscription creation time'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Last updated time'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_push_sub_staff', 'push_subscriptions', ['staff_id'])
    op.create_index('idx_push_sub_org', 'push_subscriptions', ['organization_id'])
    op.create_index('idx_push_sub_org_staff', 'push_subscriptions', ['organization_id', 'staff_id'])

    # Create unique constraint
    op.create_unique_constraint('uq_staff_endpoint', 'push_subscriptions', ['staff_id', 'endpoint'])

    # Create foreign keys
    op.create_foreign_key(
        'fk_push_subscriptions_staff',
        'push_subscriptions',
        'staff',
        ['staff_id'],
        ['id'],
        ondelete='CASCADE'
    )

    op.create_foreign_key(
        'fk_push_subscriptions_organization',
        'push_subscriptions',
        'organizations',
        ['organization_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Add NOTIFICATION_VIEW permission to permissions table
    op.execute("""
        INSERT INTO permissions (code, name, module, description)
        VALUES (
            'NOTIFICATION_VIEW',
            'View Notifications',
            'notification',
            'View and receive browser push notifications for missing persons and alerts'
        )
        ON CONFLICT (code) DO NOTHING;
    """)


def downgrade() -> None:
    """Remove push_subscriptions table and NOTIFICATION_VIEW permission."""
    # Drop foreign keys
    op.drop_constraint('fk_push_subscriptions_organization', 'push_subscriptions', type_='foreignkey')
    op.drop_constraint('fk_push_subscriptions_staff', 'push_subscriptions', type_='foreignkey')

    # Drop indexes
    op.drop_index('idx_push_sub_org_staff', 'push_subscriptions')
    op.drop_index('idx_push_sub_org', 'push_subscriptions')
    op.drop_index('idx_push_sub_staff', 'push_subscriptions')

    # Drop unique constraint
    op.drop_constraint('uq_staff_endpoint', 'push_subscriptions', type_='unique')

    # Drop table
    op.drop_table('push_subscriptions')

    # Remove NOTIFICATION_VIEW permission
    op.execute("""
        DELETE FROM role_permissions WHERE permission_id IN (
            SELECT id FROM permissions WHERE code = 'NOTIFICATION_VIEW'
        );
    """)
    op.execute("DELETE FROM permissions WHERE code = 'NOTIFICATION_VIEW';")
