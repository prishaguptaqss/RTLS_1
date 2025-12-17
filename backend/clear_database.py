"""
Script to clear all data from the RTLS database.

This script deletes all records from all tables while preserving the schema.
Run this script from the backend directory:
    python clear_database.py

WARNING: This will delete ALL data. This action cannot be undone.
"""
from app.database import SessionLocal, engine, Base
from app.models import (
    LocationHistory,
    LiveLocation,
    Tag,
    Anchor,
    Room,
    Floor,
    Building,
    User,
    Patient
)


def clear_database():
    """Clear all data from database tables in correct order (respecting foreign keys)."""

    print("=" * 60)
    print("RTLS Database Clear Utility")
    print("=" * 60)
    print("\nWARNING: This will delete ALL data from the database!")
    print("This action cannot be undone.\n")

    confirmation = input("Type 'DELETE ALL DATA' to confirm: ")

    if confirmation != "DELETE ALL DATA":
        print("\nOperation cancelled. No data was deleted.")
        return

    db = SessionLocal()

    try:
        print("\nDeleting data in order (respecting foreign key constraints)...")

        # Delete in reverse order of dependencies

        # 1. Location data (depends on tags and rooms)
        print("  - Deleting location history records...", end=" ")
        count = db.query(LocationHistory).delete()
        print(f"({count} records)")

        print("  - Deleting live location records...", end=" ")
        count = db.query(LiveLocation).delete()
        print(f"({count} records)")

        # 2. Tags (depends on users and patients)
        print("  - Deleting tags...", end=" ")
        count = db.query(Tag).delete()
        print(f"({count} records)")

        # 3. Anchors (depends on rooms)
        print("  - Deleting anchors...", end=" ")
        count = db.query(Anchor).delete()
        print(f"({count} records)")

        # 4. Rooms (depends on floors)
        print("  - Deleting rooms...", end=" ")
        count = db.query(Room).delete()
        print(f"({count} records)")

        # 5. Floors (depends on buildings)
        print("  - Deleting floors...", end=" ")
        count = db.query(Floor).delete()
        print(f"({count} records)")

        # 6. Buildings (no dependencies)
        print("  - Deleting buildings...", end=" ")
        count = db.query(Building).delete()
        print(f"({count} records)")

        # 7. Users (no dependencies)
        print("  - Deleting users...", end=" ")
        count = db.query(User).delete()
        print(f"({count} records)")

        # 8. Patients (no dependencies)
        print("  - Deleting patients...", end=" ")
        count = db.query(Patient).delete()
        print(f"({count} records)")

        # Commit the changes
        db.commit()

        print("\n" + "=" * 60)
        print("SUCCESS: All data has been deleted from the database.")
        print("=" * 60)
        print("\nThe database schema is intact and ready for new data.")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: Failed to clear database: {e}")
        print("Database rolled back - no changes were made.")
    finally:
        db.close()


def recreate_tables():
    """Drop all tables and recreate them (alternative method)."""

    print("=" * 60)
    print("RTLS Database Recreate Utility")
    print("=" * 60)
    print("\nWARNING: This will drop and recreate ALL tables!")
    print("All data will be permanently lost.\n")

    confirmation = input("Type 'RECREATE TABLES' to confirm: ")

    if confirmation != "RECREATE TABLES":
        print("\nOperation cancelled. No changes were made.")
        return

    try:
        print("\nDropping all tables...", end=" ")
        Base.metadata.drop_all(bind=engine)
        print("Done")

        print("Creating all tables...", end=" ")
        Base.metadata.create_all(bind=engine)
        print("Done")

        print("\n" + "=" * 60)
        print("SUCCESS: All tables have been recreated.")
        print("=" * 60)
        print("\nThe database is empty and ready for new data.")

    except Exception as e:
        print(f"\nERROR: Failed to recreate tables: {e}")


if __name__ == "__main__":
    print("\nChoose an option:")
    print("1. Clear all data (delete records, keep tables)")
    print("2. Recreate tables (drop and recreate all tables)")
    print("3. Cancel")

    choice = input("\nEnter choice (1, 2, or 3): ").strip()

    if choice == "1":
        clear_database()
    elif choice == "2":
        recreate_tables()
    elif choice == "3":
        print("\nOperation cancelled.")
    else:
        print("\nInvalid choice. Operation cancelled.")
