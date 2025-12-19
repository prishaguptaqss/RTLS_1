"""Add RBAC system with Staff, Role, and Permission models

Revision ID: 005_rbac_system
Revises: 004_org_scoping
Create Date: 2025-12-19

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = '005_rbac_system'
down_revision = '004_org_scoping'
branch_labels = None
depends_on = None


def upgrade():
    # Create staff table
    op.create_table(
        'staff',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('staff_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('staff_id'),
        sa.UniqueConstraint('email'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL')
    )
    op.create_index('idx_staff_staff_id', 'staff', ['staff_id'])
    op.create_index('idx_staff_email', 'staff', ['email'])

    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('module', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index('idx_permissions_code', 'permissions', ['code'])

    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE')
    )
    op.create_index('idx_roles_name', 'roles', ['name'])

    # Create role_permissions junction table
    op.create_table(
        'role_permissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permission')
    )

    # Create staff_roles junction table
    op.create_table(
        'staff_roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('staff_id', 'role_id', name='uq_staff_role')
    )

    # Seed permissions
    op.execute("""
        INSERT INTO permissions (code, name, module, description) VALUES
        -- Dashboard
        ('DASHBOARD_VIEW', 'View Dashboard', 'dashboard', 'Access to view the dashboard'),

        -- Buildings
        ('BUILDING_VIEW', 'View Buildings', 'building', 'View buildings, floors, and rooms'),
        ('BUILDING_CREATE', 'Create Building', 'building', 'Create new buildings'),
        ('BUILDING_EDIT', 'Edit Building', 'building', 'Edit existing buildings'),
        ('BUILDING_DELETE', 'Delete Building', 'building', 'Delete buildings'),
        ('FLOOR_CREATE', 'Add Floor', 'building', 'Add floors to buildings'),
        ('FLOOR_EDIT', 'Edit Floor', 'building', 'Edit existing floors'),
        ('FLOOR_DELETE', 'Delete Floor', 'building', 'Delete floors'),
        ('ROOM_CREATE', 'Add Room', 'building', 'Add rooms to floors'),
        ('ROOM_EDIT', 'Edit Room', 'building', 'Edit existing rooms'),
        ('ROOM_DELETE', 'Delete Room', 'building', 'Delete rooms'),

        -- Entities
        ('ENTITY_VIEW', 'View Entities', 'entity', 'View entities (patients/materials)'),
        ('ENTITY_ADMIT', 'Admit Entity', 'entity', 'Admit new entities'),
        ('ENTITY_EDIT', 'Edit Entity', 'entity', 'Edit entity information'),
        ('ENTITY_DISCHARGE', 'Discharge Entity', 'entity', 'Discharge entities'),
        ('ENTITY_DELETE', 'Delete Entity', 'entity', 'Delete entities'),

        -- Devices
        ('DEVICE_VIEW', 'View Devices', 'device', 'View devices (tags and anchors)'),
        ('DEVICE_CREATE', 'Add Device', 'device', 'Add new devices'),
        ('DEVICE_EDIT', 'Edit Device', 'device', 'Edit device information'),
        ('DEVICE_DELETE', 'Delete Device', 'device', 'Delete devices'),

        -- Live Positions
        ('LIVE_POSITION_VIEW', 'View Live Positions', 'live_position', 'View real-time location tracking'),

        -- Staff Management
        ('STAFF_VIEW', 'View Staff', 'staff', 'View staff users'),
        ('STAFF_CREATE', 'Create Staff', 'staff', 'Create new staff users'),
        ('STAFF_EDIT', 'Edit Staff', 'staff', 'Edit staff user information'),
        ('STAFF_DELETE', 'Delete Staff', 'staff', 'Delete staff users'),

        -- Role Management
        ('ROLE_VIEW', 'View Roles', 'role', 'View roles and permissions'),
        ('ROLE_CREATE', 'Create Role', 'role', 'Create new roles'),
        ('ROLE_EDIT', 'Edit Role', 'role', 'Edit existing roles'),
        ('ROLE_DELETE', 'Delete Role', 'role', 'Delete roles'),

        -- Settings
        ('SETTINGS_VIEW', 'View Settings', 'settings', 'Access settings page'),

        -- Organizations
        ('ORGANIZATION_VIEW', 'View Organizations', 'organization', 'View organizations'),
        ('ORGANIZATION_CREATE', 'Create Organization', 'organization', 'Create new organizations'),
        ('ORGANIZATION_EDIT', 'Edit Organization', 'organization', 'Edit organization information'),
        ('ORGANIZATION_DELETE', 'Delete Organization', 'organization', 'Delete organizations')
    """)

    # Create default admin user
    # Note: Password is hashed version of "admin123" using bcrypt
    # In production, this should be changed via environment variable
    op.execute("""
        INSERT INTO staff (staff_id, name, email, phone, password_hash, is_admin, is_active, organization_id)
        VALUES (
            'admin',
            'System Administrator',
            'admin@rtls.com',
            NULL,
            '$2b$12$Fk0o0JBm0IgJbhRga2VypuyGE8.Aq35TWKGOIE3cx0fEde9SrQ2/e',
            true,
            true,
            NULL
        )
    """)


def downgrade():
    # Drop tables in reverse order
    op.drop_table('staff_roles')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')
    op.drop_table('staff')
