"""
Quick test to verify that unassigning a tag properly closes location records and clears live location.
"""

import sys
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.models.entity import Entity
from app.models.tag import Tag
from app.models.location_history import LocationHistory
from app.models.live_location import LiveLocation
from app.models.entity_tag_assignment import EntityTagAssignment
from app.models.organization import Organization
from app.models.room import Room

def test_unassignment_cleanup():
    """Test that unassignment properly closes location records"""
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("\n" + "="*60)
        print("TEST: Unassignment Cleanup")
        print("="*60 + "\n")

        # Get organization
        org = session.query(Organization).first()
        if not org:
            print("❌ No organization found")
            return False

        # Get or create a room
        room = session.query(Room).filter(Room.organization_id == org.id).first()
        if not room:
            print("❌ No room found")
            return False

        # Clean up test data
        print("🧹 Cleaning up test data...")
        session.query(LiveLocation).filter(LiveLocation.tag_id == "TEST:UNASSIGN:TAG").delete()
        session.query(LocationHistory).filter(LocationHistory.tag_id == "TEST:UNASSIGN:TAG").delete()
        session.query(EntityTagAssignment).filter(EntityTagAssignment.tag_id == "TEST:UNASSIGN:TAG").delete()
        session.query(Tag).filter(Tag.tag_id == "TEST:UNASSIGN:TAG").delete()
        session.query(Entity).filter(Entity.entity_id == "TEST_UNASSIGN_ENTITY").delete()
        session.commit()

        # Create test entity
        print("📝 Creating test entity...")
        entity = Entity(
            entity_id="TEST_UNASSIGN_ENTITY",
            organization_id=org.id,
            type="person",
            name="Test Unassign Entity"
        )
        session.add(entity)
        session.flush()

        # Create test tag
        print("📝 Creating test tag...")
        tag = Tag(
            tag_id="TEST:UNASSIGN:TAG",
            organization_id=org.id,
            name="Test Unassign Tag",
            status="active",
            assigned_entity_id=entity.id
        )
        session.add(tag)
        session.flush()

        # Create assignment record
        print("📝 Creating assignment record...")
        assignment_time = datetime.now(timezone.utc) - timedelta(hours=1)
        assignment = EntityTagAssignment(
            entity_id=entity.id,
            tag_id=tag.tag_id,
            assigned_at=assignment_time,
            unassigned_at=None
        )
        session.add(assignment)
        session.flush()

        # Create an OPEN location history entry (exited_at = NULL)
        print("📍 Creating open location history entry...")
        location_entry = LocationHistory(
            tag_id=tag.tag_id,
            room_id=room.id,
            entered_at=datetime.now(timezone.utc) - timedelta(minutes=30),
            exited_at=None  # Currently in room
        )
        session.add(location_entry)
        session.flush()

        # Create a live location entry
        print("📍 Creating live location entry...")
        live_loc = LiveLocation(
            tag_id=tag.tag_id,
            room_id=room.id,
            organization_id=org.id
        )
        session.add(live_loc)
        session.commit()

        print("\n✅ Setup complete!")
        print(f"   - Entity: {entity.name}")
        print(f"   - Tag: {tag.tag_id}")
        print(f"   - Location entry exited_at: {location_entry.exited_at}")
        print(f"   - Live location exists: Yes")

        # Now simulate unassignment
        print("\n" + "-"*60)
        print("🔓 UNASSIGNING TAG...")
        print("-"*60 + "\n")

        unassignment_time = datetime.now(timezone.utc)

        # Close assignment
        assignment.unassigned_at = unassignment_time

        # Close open location entry
        open_loc = session.query(LocationHistory).filter(
            LocationHistory.tag_id == tag.tag_id,
            LocationHistory.exited_at.is_(None)
        ).first()
        if open_loc:
            open_loc.exited_at = unassignment_time

        # Remove live location
        live_location = session.query(LiveLocation).filter(
            LiveLocation.tag_id == tag.tag_id
        ).first()
        if live_location:
            session.delete(live_location)

        # Unassign tag
        tag.assigned_entity_id = None
        session.commit()

        print("✅ Unassignment complete!\n")

        # Verify results
        print("="*60)
        print("VERIFICATION")
        print("="*60 + "\n")

        # Check assignment record
        assignment_check = session.query(EntityTagAssignment).filter(
            EntityTagAssignment.tag_id == tag.tag_id
        ).first()
        print(f"✓ Assignment record unassigned_at: {assignment_check.unassigned_at}")

        # Check location history
        location_check = session.query(LocationHistory).filter(
            LocationHistory.id == location_entry.id
        ).first()
        print(f"✓ Location entry exited_at: {location_check.exited_at}")

        # Check live location
        live_check = session.query(LiveLocation).filter(
            LiveLocation.tag_id == tag.tag_id
        ).first()
        print(f"✓ Live location exists: {'Yes' if live_check else 'No (correctly removed)'}")

        # Check tag assignment
        tag_check = session.query(Tag).filter(Tag.tag_id == tag.tag_id).first()
        print(f"✓ Tag assigned_entity_id: {tag_check.assigned_entity_id}")

        # Verify all checks pass
        success = (
            assignment_check.unassigned_at is not None and
            location_check.exited_at is not None and
            live_check is None and
            tag_check.assigned_entity_id is None
        )

        if success:
            print("\n" + "="*60)
            print("✅ ALL CHECKS PASSED!")
            print("="*60)
        else:
            print("\n" + "="*60)
            print("❌ SOME CHECKS FAILED")
            print("="*60)

        # Cleanup
        print("\n🧹 Cleaning up test data...")
        session.query(LocationHistory).filter(LocationHistory.tag_id == "TEST:UNASSIGN:TAG").delete()
        session.query(EntityTagAssignment).filter(EntityTagAssignment.tag_id == "TEST:UNASSIGN:TAG").delete()
        session.query(Tag).filter(Tag.tag_id == "TEST:UNASSIGN:TAG").delete()
        session.query(Entity).filter(Entity.entity_id == "TEST_UNASSIGN_ENTITY").delete()
        session.commit()

        return success

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        session.rollback()
        return False
    finally:
        session.close()


if __name__ == "__main__":
    success = test_unassignment_cleanup()
    sys.exit(0 if success else 1)
