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


def create_default_admin(db):
    """Create default admin user if it doesn't exist."""
    try:
        # Check if admin already exists
        result = db.execute(
            text("SELECT COUNT(*) FROM staff WHERE email = :email"),
            {"email": settings.DEFAULT_ADMIN_EMAIL}
        )
        count = result.scalar()

        if count > 0:
            logger.info(f"Admin user already exists: {settings.DEFAULT_ADMIN_EMAIL}")
            return True

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

        logger.info(f"✓ Default admin created successfully")
        logger.info(f"  Email: {settings.DEFAULT_ADMIN_EMAIL}")
        logger.info(f"  Password: {settings.DEFAULT_ADMIN_PASSWORD}")
        logger.info(f"  ⚠️  IMPORTANT: Change this password in production!")

        return True

    except Exception as e:
        logger.error(f"Failed to create default admin: {e}")
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

        # Even if initialized, check and seed permissions if missing
        db = SessionLocal()
        try:
            result = db.execute(text("SELECT COUNT(*) FROM permissions"))
            perm_count = result.scalar()

            if perm_count == 0:
                logger.info("Permissions table is empty, seeding...")
                seed_permissions(db)

            result = db.execute(
                text("SELECT COUNT(*) FROM staff WHERE email = :email"),
                {"email": settings.DEFAULT_ADMIN_EMAIL}
            )
            admin_count = result.scalar()

            if admin_count == 0:
                logger.info("Admin user missing, creating...")
                create_default_admin(db)

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

        # Create default admin
        if not create_default_admin(db):
            logger.error("Failed to create default admin. Aborting initialization.")
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
