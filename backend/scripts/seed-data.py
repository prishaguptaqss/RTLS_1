#!/usr/bin/env python3
"""
Seed database with initial test data.
Run this after migrations: python scripts/seed-data.py
"""
from app.database import SessionLocal
from app.models.building import Building
from app.models.floor import Floor
from app.models.room import Room
from app.models.user import User
from app.models.tag import Tag
from app.models.anchor import Anchor
from app.utils.enums import UserStatus, TagStatus, AnchorStatus


def seed_database():
    """Seed database with initial test data."""
    db = SessionLocal()

    try:
        print("Seeding database...")

        # Create building
        building = Building(name='Main Hospital')
        db.add(building)
        db.commit()
        print(f"✓ Created building: {building.name}")

        # Create floors
        floor1 = Floor(building_id=building.id, floor_number=1)
        floor2 = Floor(building_id=building.id, floor_number=2)
        db.add_all([floor1, floor2])
        db.commit()
        print(f"✓ Created floors: 1, 2")

        # Create rooms
        rooms = [
            Room(floor_id=floor1.id, room_name='Room 101', room_type='Ward'),
            Room(floor_id=floor1.id, room_name='Room 102', room_type='Ward'),
            Room(floor_id=floor1.id, room_name='Room 103', room_type='ICU'),
            Room(floor_id=floor1.id, room_name='Room 104', room_type='Ward'),
            Room(floor_id=floor1.id, room_name='Room 105', room_type='Ward'),
            Room(floor_id=floor2.id, room_name='Room 201', room_type='Ward'),
            Room(floor_id=floor2.id, room_name='Room 202', room_type='Operating Room'),
        ]
        db.add_all(rooms)
        db.commit()
        print(f"✓ Created {len(rooms)} rooms")

        # Create anchors (ESP32 gateways)
        anchors = [
            Anchor(anchor_id='Room 101', room_id=rooms[0].id, status=AnchorStatus.active),
            Anchor(anchor_id='Room 102', room_id=rooms[1].id, status=AnchorStatus.active),
            Anchor(anchor_id='Room 103', room_id=rooms[2].id, status=AnchorStatus.active),
            Anchor(anchor_id='Room 104', room_id=rooms[3].id, status=AnchorStatus.active),
            Anchor(anchor_id='Room 105', room_id=rooms[4].id, status=AnchorStatus.active),
        ]
        db.add_all(anchors)
        db.commit()
        print(f"✓ Created {len(anchors)} anchors")

        # Create sample users
        users = [
            User(name='Piyush Sharma', email='piyush@hospital.com', role='Doctor', status=UserStatus.active),
            User(name='Manish Kumar', email='manish@hospital.com', role='Nurse', status=UserStatus.active),
            User(name='Sanchit Sharma', email='sanchit@hospital.com', role='Patient', status=UserStatus.active),
        ]
        db.add_all(users)
        db.commit()
        print(f"✓ Created {len(users)} users")

        # Create sample tags
        tags = [
            Tag(tag_id='E0:C0:74:C6:AD:C8', assigned_user_id=users[0].id, status=TagStatus.active),
            Tag(tag_id='E0:C0:74:C6:AD:C9', assigned_user_id=users[1].id, status=TagStatus.active),
            Tag(tag_id='E0:C0:74:C6:AD:CA', assigned_user_id=users[2].id, status=TagStatus.active),
        ]
        db.add_all(tags)
        db.commit()
        print(f"✓ Created {len(tags)} tags")

        print("\n✅ Database seeding completed successfully!")
        print(f"   - {len(users)} users")
        print(f"   - {len(rooms)} rooms in {building.name}")
        print(f"   - {len(tags)} tags")
        print(f"   - {len(anchors)} anchors")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
