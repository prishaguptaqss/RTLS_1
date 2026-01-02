"""
Database initialization and migration handler.
Automatically sets up database schema and seeds initial data on first run.
"""

import logging
from sqlalchemy import text, inspect
from alembic.config import Config
from alembic import command
from app.database import engine, SessionLocal
from app.config import settings
from app.utils.auth import get_password_hash
import os

logger = logging.getLogger(__name__)


def check_database_initialized():
    """Check if database has been initialized (tables exist)."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    # Check if critical tables exist
    required_tables = ['staff', 'roles', 'permissions', 'organizations']
    return all(table in tables for table in required_tables)


def run_migrations():
    """Run Alembic migrations to create/update database schema."""
    try:
        logger.info("Running database migrations...")

        # Get the alembic.ini path
        alembic_ini_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'alembic.ini'
        )

        # Create Alembic config
        alembic_cfg = Config(alembic_ini_path)

        # Run migrations to head
        command.upgrade(alembic_cfg, "head")

        logger.info("✓ Database migrations completed successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to run migrations: {e}")
        return False


def seed_permissions(db):
    """Seed the 34 default permissions into the database."""
    try:
        # Check if permissions already exist
        result = db.execute(text("SELECT COUNT(*) FROM permissions"))
        count = result.scalar()

        if count > 0:
            logger.info(f"Permissions already seeded ({count} permissions found)")
            return True

        logger.info("Seeding permissions...")

        permissions_sql = """
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

            -- Live Tracking
            ('LIVE_TRACKING_VIEW', 'View Live Tracking', 'live_tracking', 'Access live tracking feature with map view'),

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
        """

        db.execute(text(permissions_sql))
        db.commit()

        # Verify
        result = db.execute(text("SELECT COUNT(*) FROM permissions"))
        count = result.scalar()

        logger.info(f"✓ Successfully seeded {count} permissions")
        return True

    except Exception as e:
        logger.error(f"Failed to seed permissions: {e}")
        db.rollback()
        return False


def create_admin_role(db):
    """Create Admin role with all permissions if it doesn't exist."""
    try:
        # Check if Admin role already exists
        result = db.execute(
            text("SELECT id FROM roles WHERE name = :name"),
            {"name": "Admin"}
        )
        admin_role = result.fetchone()

        if admin_role:
            logger.info(f"Admin role already exists (ID: {admin_role[0]})")
            return admin_role[0]

        logger.info("Creating Admin role...")

        # Create Admin role (no organization_id means it's a global role)
        role_sql = """
            INSERT INTO roles (name, description, organization_id)
            VALUES (:name, :description, :org_id)
        """

        db.execute(text(role_sql), {
            "name": "Admin",
            "description": "Administrator role with all permissions and access to all organizations",
            "org_id": None
        })

        db.commit()

        # Get the newly created role ID
        result = db.execute(
            text("SELECT id FROM roles WHERE name = :name"),
            {"name": "Admin"}
        )
        admin_role_id = result.scalar()

        logger.info(f"✓ Admin role created (ID: {admin_role_id})")

        # Assign ALL permissions to Admin role
        logger.info("Assigning all permissions to Admin role...")

        # Get all permission IDs
        result = db.execute(text("SELECT id FROM permissions"))
        permission_ids = [row[0] for row in result.fetchall()]

        if not permission_ids:
            logger.error("No permissions found to assign to Admin role")
            return admin_role_id

        # Create role_permissions entries for all permissions
        for perm_id in permission_ids:
            db.execute(
                text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)"),
                {"role_id": admin_role_id, "perm_id": perm_id}
            )

        db.commit()

        logger.info(f"✓ Assigned {len(permission_ids)} permissions to Admin role")

        return admin_role_id

    except Exception as e:
        logger.error(f"Failed to create Admin role: {e}")
        db.rollback()
        return None


def create_default_admin(db):
    """Create default admin user if it doesn't exist."""
    try:
        # Check if admin already exists
        result = db.execute(
            text("SELECT id FROM staff WHERE email = :email"),
            {"email": settings.DEFAULT_ADMIN_EMAIL}
        )
        admin_user = result.fetchone()

        if admin_user:
            logger.info(f"Admin user already exists: {settings.DEFAULT_ADMIN_EMAIL}")
            return admin_user[0]

        logger.info("Creating default admin user...")

        # Hash the default password
        password_hash = get_password_hash(settings.DEFAULT_ADMIN_PASSWORD)

        # Create admin user
        admin_sql = """
            INSERT INTO staff (staff_id, name, email, phone, password_hash, is_admin, is_active, organization_id)
            VALUES (:staff_id, :name, :email, :phone, :password_hash, :is_admin, :is_active, :org_id)
        """

        db.execute(text(admin_sql), {
            "staff_id": "admin",
            "name": settings.DEFAULT_ADMIN_NAME,
            "email": settings.DEFAULT_ADMIN_EMAIL,
            "phone": None,
            "password_hash": password_hash,
            "is_admin": True,
            "is_active": True,
            "org_id": None
        })

        db.commit()

        # Get the newly created admin user ID
        result = db.execute(
            text("SELECT id FROM staff WHERE email = :email"),
            {"email": settings.DEFAULT_ADMIN_EMAIL}
        )
        admin_user_id = result.scalar()

        logger.info(f"✓ Default admin created successfully (ID: {admin_user_id})")
        logger.info(f"  Email: {settings.DEFAULT_ADMIN_EMAIL}")
        logger.info(f"  Password: {settings.DEFAULT_ADMIN_PASSWORD}")
        logger.info(f"  ⚠️  IMPORTANT: Change this password in production!")

        return admin_user_id

    except Exception as e:
        logger.error(f"Failed to create default admin: {e}")
        db.rollback()
        return None


def assign_admin_role_to_user(db, admin_user_id, admin_role_id):
    """Assign Admin role to the admin user."""
    try:
        # Check if role is already assigned
        result = db.execute(
            text("SELECT COUNT(*) FROM staff_roles WHERE staff_id = :staff_id AND role_id = :role_id"),
            {"staff_id": admin_user_id, "role_id": admin_role_id}
        )
        count = result.scalar()

        if count > 0:
            logger.info(f"Admin role already assigned to admin user")
            return True

        logger.info("Assigning Admin role to admin user...")

        # Assign role to user
        db.execute(
            text("INSERT INTO staff_roles (staff_id, role_id) VALUES (:staff_id, :role_id)"),
            {"staff_id": admin_user_id, "role_id": admin_role_id}
        )

        db.commit()

        logger.info(f"✓ Admin role assigned to admin user successfully")

        return True

    except Exception as e:
        logger.error(f"Failed to assign Admin role to user: {e}")
        db.rollback()
        return False


def initialize_database():
    """
    Main initialization function.
    Checks if database is initialized and runs setup if needed.
    """
    logger.info("=" * 60)
    logger.info("DATABASE INITIALIZATION CHECK")
    logger.info("=" * 60)

    # Check if database is already initialized
    is_initialized = check_database_initialized()

    if is_initialized:
        logger.info("✓ Database already initialized")

        # Even if initialized, check and seed missing data
        db = SessionLocal()
        try:
            # Check and seed permissions if missing
            result = db.execute(text("SELECT COUNT(*) FROM permissions"))
            perm_count = result.scalar()

            if perm_count == 0:
                logger.info("Permissions table is empty, seeding...")
                seed_permissions(db)

            # Check and create Admin role if missing
            result = db.execute(
                text("SELECT id FROM roles WHERE name = :name"),
                {"name": "Admin"}
            )
            admin_role = result.fetchone()

            if not admin_role:
                logger.info("Admin role missing, creating...")
                admin_role_id = create_admin_role(db)
            else:
                admin_role_id = admin_role[0]

            # Check and create admin user if missing
            result = db.execute(
                text("SELECT id FROM staff WHERE email = :email"),
                {"email": settings.DEFAULT_ADMIN_EMAIL}
            )
            admin_user = result.fetchone()

            if not admin_user:
                logger.info("Admin user missing, creating...")
                admin_user_id = create_default_admin(db)
            else:
                admin_user_id = admin_user[0]

            # Check if admin user has Admin role assigned
            if admin_role_id and admin_user_id:
                result = db.execute(
                    text("SELECT COUNT(*) FROM staff_roles WHERE staff_id = :staff_id AND role_id = :role_id"),
                    {"staff_id": admin_user_id, "role_id": admin_role_id}
                )
                role_assigned = result.scalar()

                if role_assigned == 0:
                    logger.info("Admin role not assigned to admin user, assigning...")
                    assign_admin_role_to_user(db, admin_user_id, admin_role_id)

        finally:
            db.close()

        logger.info("=" * 60)
        return True

    logger.info("Database not initialized. Starting setup...")
    logger.info("")

    # Step 1: Run migrations
    if not run_migrations():
        logger.error("Failed to run migrations. Aborting initialization.")
        return False

    logger.info("")

    # Step 2: Seed data
    db = SessionLocal()
    try:
        # Seed permissions
        if not seed_permissions(db):
            logger.error("Failed to seed permissions. Aborting initialization.")
            return False

        logger.info("")

        # Create Admin role with all permissions
        admin_role_id = create_admin_role(db)
        if not admin_role_id:
            logger.error("Failed to create Admin role. Aborting initialization.")
            return False

        logger.info("")

        # Create default admin user
        admin_user_id = create_default_admin(db)
        if not admin_user_id:
            logger.error("Failed to create default admin. Aborting initialization.")
            return False

        logger.info("")

        # Assign Admin role to admin user
        if not assign_admin_role_to_user(db, admin_user_id, admin_role_id):
            logger.error("Failed to assign Admin role to admin user. Aborting initialization.")
            return False

        logger.info("")
        logger.info("=" * 60)
        logger.info("✓ DATABASE INITIALIZATION COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        logger.info("")
        logger.info("Default Admin Credentials:")
        logger.info(f"  Email:    {settings.DEFAULT_ADMIN_EMAIL}")
        logger.info(f"  Password: {settings.DEFAULT_ADMIN_PASSWORD}")
        logger.info("")
        logger.info("⚠️  IMPORTANT: Change the default password immediately!")
        logger.info("=" * 60)

        return True

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False
    finally:
        db.close()
