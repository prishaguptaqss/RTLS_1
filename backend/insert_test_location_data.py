#!/usr/bin/env python3
"""
Test data insertion script for RTLS location history.
This script creates test entities, tags, and location history data
so you can test the pagination and export functionality.

Usage:
    # Activate virtual environment first
    source venv/bin/activate  # On Mac/Linux
    # or
    .\venv\Scripts\activate  # On Windows

    # Then run the script
    python insert_test_location_data.py
"""

import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Check if running in virtual environment
if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
    print("⚠️  WARNING: Virtual environment not detected!")
    print("Please activate your virtual environment first:")
    print("  source venv/bin/activate  # On Mac/Linux")
    print("  or")
    print("  .\\venv\\Scripts\\activate  # On Windows")
    print()
    response = input("Continue anyway? (yes/no): ").strip().lower()
    if response != 'yes':
        print("Exiting...")
        sys.exit(0)

from app.database import SessionLocal, engine
from app.models.entity import Entity
from app.models.tag import Tag
from app.models.room import Room
from app.models.location_history import LocationHistory
from app.models.live_location import LiveLocation
from app.models.organization import Organization
from app.models.building import Building
from app.models.floor import Floor


def get_or_create_test_data(db: Session):
    """Get existing organization and rooms or create them if they don't exist."""

    # Get the first organization (or create one if needed)
    org = db.query(Organization).first()
    if not org:
        print("❌ No organization found. Please create an organization first through the UI.")
        return None, None

    print(f"✅ Using organization: {org.name} (ID: {org.id})")

    # Get or create a building
    building = db.query(Building).filter(Building.organization_id == org.id).first()
    if not building:
        building = Building(
            organization_id=org.id,
            building_name="Test Building",
            address="123 Test Street"
        )
        db.add(building)
        db.commit()
        db.refresh(building)
        print(f"✅ Created building: {building.building_name}")

    # Get or create a floor
    floor = db.query(Floor).filter(Floor.building_id == building.id).first()
    if not floor:
        floor = Floor(
            building_id=building.id,
            floor_number=1,
            floor_name="First Floor"
        )
        db.add(floor)
        db.commit()
        db.refresh(floor)
        print(f"✅ Created floor: {floor.floor_name}")

    # Get or create test rooms
    room_names = ["Room 101", "Room 102", "ICU-A", "ER-1", "Ward-3", "OR-2"]
    rooms = []

    for room_name in room_names:
        room = db.query(Room).filter(
            Room.room_name == room_name,
            Room.organization_id == org.id
        ).first()

        if not room:
            room = Room(
                organization_id=org.id,
                floor_id=floor.id,
                room_name=room_name,
                room_type="General" if "Room" in room_name else room_name.split("-")[0]
            )
            db.add(room)
            rooms.append(room)

    if rooms:
        db.commit()
        for room in rooms:
            db.refresh(room)
        print(f"✅ Created {len(rooms)} rooms")

    # Get all rooms for this organization
    all_rooms = db.query(Room).filter(Room.organization_id == org.id).all()
    print(f"✅ Total rooms available: {len(all_rooms)}")

    return org, all_rooms


def create_test_entity_with_history(db: Session, org: Organization, rooms: list):
    """Create a test entity with tag and location history."""

    # Create or get test entity
    entity_id = "TEST-ENT-001"
    entity = db.query(Entity).filter(
        Entity.entity_id == entity_id,
        Entity.organization_id == org.id
    ).first()

    if entity:
        print(f"⚠️  Entity {entity_id} already exists. Deleting old data...")
        # Delete old tag (which will cascade delete location history)
        old_tags = db.query(Tag).filter(Tag.assigned_entity_id == entity.id).all()
        for tag in old_tags:
            db.delete(tag)
        db.delete(entity)
        db.commit()

    # Create entity
    entity = Entity(
        entity_id=entity_id,
        organization_id=org.id,
        type="person",
        name="Test Person for History"
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    print(f"✅ Created entity: {entity.name} ({entity.entity_id})")

    # Create tag and assign to entity
    tag_id = "AA:BB:CC:DD:EE:FF"
    tag = Tag(
        tag_id=tag_id,
        organization_id=org.id,
        name="Test Tag 1",
        assigned_entity_id=entity.id,
        status="active",
        last_seen=datetime.now()
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    print(f"✅ Created tag: {tag.name} ({tag.tag_id}) assigned to entity")

    # Create location history (30+ records for pagination testing)
    print("📝 Creating location history records...")

    base_time = datetime.now() - timedelta(days=7)  # Start 7 days ago
    history_records = []

    # Create 30 location history records
    for i in range(30):
        room = rooms[i % len(rooms)]  # Cycle through rooms

        # Each stay is 15-30 minutes
        entered_at = base_time + timedelta(hours=i * 0.5)
        exited_at = entered_at + timedelta(minutes=15 + (i % 15))
        duration_minutes = int((exited_at - entered_at).total_seconds() / 60)

        # The last record should be "currently here" (exited_at = NULL)
        if i == 29:
            exited_at = None
            duration_minutes = None

        history = LocationHistory(
            tag_id=tag.tag_id,
            room_id=room.id,
            entered_at=entered_at,
            exited_at=exited_at
        )
        history_records.append(history)

    db.add_all(history_records)
    db.commit()
    print(f"✅ Created {len(history_records)} location history records")

    # Create live location (current location)
    current_room = rooms[-1]  # Last room in the list
    live_location = db.query(LiveLocation).filter(
        LiveLocation.tag_id == tag.tag_id
    ).first()

    if live_location:
        live_location.room_id = current_room.id
        live_location.updated_at = datetime.now()
    else:
        live_location = LiveLocation(
            tag_id=tag.tag_id,
            organization_id=org.id,
            room_id=current_room.id,
            updated_at=datetime.now()
        )
        db.add(live_location)

    db.commit()
    print(f"✅ Set live location to: {current_room.room_name}")

    return entity, tag


def create_additional_test_entities(db: Session, org: Organization, rooms: list):
    """Create additional test entities with varying amounts of history."""

    test_entities = [
        {"entity_id": "TEST-MAT-001", "type": "material", "name": "Test Material - Wheelchair", "tag_id": "11:22:33:44:55:66", "records": 15},
        {"entity_id": "TEST-PER-002", "type": "person", "name": "Test Person - Nurse", "tag_id": "AA:BB:CC:DD:EE:11", "records": 25},
        {"entity_id": "TEST-MAT-002", "type": "material", "name": "Test Material - Equipment", "tag_id": "AA:BB:CC:DD:EE:22", "records": 8},
    ]

    for test_data in test_entities:
        # Check if entity exists
        entity = db.query(Entity).filter(
            Entity.entity_id == test_data["entity_id"],
            Entity.organization_id == org.id
        ).first()

        if entity:
            print(f"⚠️  Entity {test_data['entity_id']} already exists. Skipping...")
            continue

        # Create entity
        entity = Entity(
            entity_id=test_data["entity_id"],
            organization_id=org.id,
            type=test_data["type"],
            name=test_data["name"]
        )
        db.add(entity)
        db.commit()
        db.refresh(entity)

        # Create tag
        tag = Tag(
            tag_id=test_data["tag_id"],
            organization_id=org.id,
            name=f"Tag for {test_data['name']}",
            assigned_entity_id=entity.id,
            status="active",
            last_seen=datetime.now()
        )
        db.add(tag)
        db.commit()
        db.refresh(tag)

        # Create location history
        base_time = datetime.now() - timedelta(days=3)
        history_records = []

        for i in range(test_data["records"]):
            room = rooms[i % len(rooms)]
            entered_at = base_time + timedelta(hours=i * 0.3)
            exited_at = entered_at + timedelta(minutes=20 + (i % 10))

            # Last record is current location
            if i == test_data["records"] - 1:
                exited_at = None

            history = LocationHistory(
                tag_id=tag.tag_id,
                room_id=room.id,
                entered_at=entered_at,
                exited_at=exited_at
            )
            history_records.append(history)

        db.add_all(history_records)
        db.commit()

        print(f"✅ Created entity: {entity.name} with {len(history_records)} history records")


def main():
    """Main function to insert test data."""

    print("\n" + "="*60)
    print("RTLS Test Data Insertion Script")
    print("="*60 + "\n")

    db = SessionLocal()

    try:
        # Step 1: Get or create organization and rooms
        print("Step 1: Setting up organization and rooms...")
        org, rooms = get_or_create_test_data(db)

        if not org or not rooms:
            print("❌ Failed to setup organization and rooms. Exiting.")
            return

        print()

        # Step 2: Create main test entity with 30+ history records
        print("Step 2: Creating main test entity with location history...")
        entity, tag = create_test_entity_with_history(db, org, rooms)
        print()

        # Step 3: Create additional test entities
        print("Step 3: Creating additional test entities...")
        create_additional_test_entities(db, org, rooms)
        print()

        # Step 4: Summary
        print("="*60)
        print("✨ Test Data Summary")
        print("="*60)

        total_entities = db.query(Entity).filter(Entity.organization_id == org.id).count()
        total_tags = db.query(Tag).filter(Tag.organization_id == org.id).count()
        total_history = db.query(LocationHistory).join(Tag).filter(Tag.organization_id == org.id).count()

        print(f"Organization: {org.name}")
        print(f"Total Entities: {total_entities}")
        print(f"Total Tags: {total_tags}")
        print(f"Total Location History Records: {total_history}")
        print()

        print("🎉 Test data inserted successfully!")
        print()
        print("📝 Next steps:")
        print("1. Go to the Entities page in the UI")
        print("2. Click the history (clock) icon for 'Test Person for History'")
        print("3. You should see 30 location history records with pagination")
        print("4. Test the 'Download CSV' and 'Download PDF' buttons")
        print()

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
