"""
Test script for entity-wise location history preservation.

This script tests the new location history feature without needing real anchors/tags.
It creates test data, simulates tag assignments/unassignments, and verifies that:
1. Entity A keeps ALL history after tag unassignment
2. Entity B gets clean slate when assigned the same tag
3. Location history is correctly filtered by assignment periods

Usage:
    python test_location_history_preservation.py
"""

import sys
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.models.entity import Entity
from app.models.tag import Tag
from app.models.location_history import LocationHistory
from app.models.entity_tag_assignment import EntityTagAssignment
from app.models.room import Room
from app.models.floor import Floor
from app.models.building import Building
from app.models.organization import Organization


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")


def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")


def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")


def print_section(msg):
    print(f"\n{Colors.BOLD}{Colors.YELLOW}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.YELLOW}{msg}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.YELLOW}{'='*60}{Colors.END}\n")


def setup_test_data(session, org):
    """Use or create test building, floor, room for location history"""
    print_section("Setting up test infrastructure")

    # Try to use existing room first, or create new ones
    room = session.query(Room).filter(
        Room.organization_id == org.id
    ).first()

    if room:
        print_info(f"Using existing room: {room.room_name}")
        floor = session.query(Floor).get(room.floor_id)
        building = session.query(Building).get(floor.building_id)
        print_info(f"Using existing floor: {floor.floor_number}")
        print_info(f"Using existing building: {building.name}")
        return building, floor, room

    # No room exists, create test infrastructure
    import random
    unique_id = random.randint(10000, 99999)

    # Create building
    building = Building(
        name=f"Test Building {unique_id}",
        organization_id=org.id
    )
    session.add(building)
    session.flush()
    print_info(f"Created building: {building.name}")

    # Create floor
    floor = Floor(
        building_id=building.id,
        floor_number=99
    )
    session.add(floor)
    session.flush()
    print_info(f"Created floor: {floor.floor_number}")

    # Create room
    room = Room(
        floor_id=floor.id,
        organization_id=org.id,
        room_name=f"Test Room {unique_id}",
        room_type="Test Room"
    )
    session.add(room)
    session.flush()
    print_info(f"Created room: {room.room_name}")

    return building, floor, room


def create_test_entities(session, org):
    """Create test entities A and B"""
    print_section("Creating test entities")

    entity_a = Entity(
        entity_id="TEST_ENTITY_A",
        organization_id=org.id,
        type="person",
        name="Test Entity A"
    )
    session.add(entity_a)
    session.flush()
    print_info(f"Created {entity_a.name} (ID: {entity_a.entity_id})")

    entity_b = Entity(
        entity_id="TEST_ENTITY_B",
        organization_id=org.id,
        type="person",
        name="Test Entity B"
    )
    session.add(entity_b)
    session.flush()
    print_info(f"Created {entity_b.name} (ID: {entity_b.entity_id})")

    return entity_a, entity_b


def create_test_tag(session, org):
    """Create a test tag"""
    tag = Tag(
        tag_id="TEST:TAG:00:00:00:01",
        organization_id=org.id,
        name="Test Tag 1",
        status="active"
    )
    session.add(tag)
    session.flush()
    print_info(f"Created tag: {tag.tag_id}")
    return tag


def create_location_history_entries(session, tag_id, room_id, start_time, count=5):
    """Create multiple location history entries"""
    entries = []
    current_time = start_time

    for i in range(count):
        entry = LocationHistory(
            tag_id=tag_id,
            room_id=room_id,
            entered_at=current_time,
            exited_at=current_time + timedelta(minutes=10)
        )
        session.add(entry)
        entries.append(entry)
        current_time += timedelta(minutes=15)  # 5 min gap between visits

    session.flush()
    return entries


def assign_tag_to_entity(session, tag, entity):
    """Assign a tag to an entity and create assignment record"""
    assigned_at = datetime.now(timezone.utc)

    # Update tag assignment
    tag.assigned_entity_id = entity.id

    # Create assignment record
    assignment = EntityTagAssignment(
        entity_id=entity.id,
        tag_id=tag.tag_id,
        assigned_at=assigned_at,
        unassigned_at=None
    )
    session.add(assignment)
    session.flush()

    return assignment


def unassign_tag_from_entity(session, tag, entity):
    """Unassign a tag from an entity and close assignment record"""
    unassigned_at = datetime.now(timezone.utc)

    # Close assignment record
    assignment = session.query(EntityTagAssignment).filter(
        EntityTagAssignment.entity_id == entity.id,
        EntityTagAssignment.tag_id == tag.tag_id,
        EntityTagAssignment.unassigned_at.is_(None)
    ).first()

    if assignment:
        assignment.unassigned_at = unassigned_at

    # Update tag
    tag.assigned_entity_id = None
    session.flush()

    return assignment


def get_entity_location_history(session, entity):
    """Query location history for an entity using the new temporal join"""
    from sqlalchemy import or_

    results = (
        session.query(
            LocationHistory.id,
            LocationHistory.entered_at,
            LocationHistory.exited_at,
            Room.room_name
        )
        .join(
            EntityTagAssignment,
            LocationHistory.tag_id == EntityTagAssignment.tag_id
        )
        .outerjoin(Room, LocationHistory.room_id == Room.id)
        .filter(
            EntityTagAssignment.entity_id == entity.id,
            LocationHistory.entered_at >= EntityTagAssignment.assigned_at,
            or_(
                EntityTagAssignment.unassigned_at.is_(None),
                LocationHistory.entered_at < EntityTagAssignment.unassigned_at
            )
        )
        .order_by(LocationHistory.entered_at.desc())
        .all()
    )

    return results


def run_test_scenario():
    """Run the complete test scenario"""
    # Create database session
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print_section("🧪 LOCATION HISTORY PRESERVATION TEST")
        print_info("This test verifies entity-wise location history preservation")

        # Get or create test organization
        org = session.query(Organization).first()
        if not org:
            print_error("No organization found in database. Please create one first.")
            return False
        print_info(f"Using organization: {org.name} (ID: {org.id})")

        # Cleanup any leftover test data from previous runs
        print_info("Cleaning up any leftover test data...")
        session.query(LocationHistory).filter(LocationHistory.tag_id == "TEST:TAG:00:00:00:01").delete()
        session.query(EntityTagAssignment).filter(EntityTagAssignment.tag_id == "TEST:TAG:00:00:00:01").delete()
        session.query(Tag).filter(Tag.tag_id == "TEST:TAG:00:00:00:01").delete()
        session.query(Entity).filter(Entity.entity_id.in_(['TEST_ENTITY_A', 'TEST_ENTITY_B'])).delete()
        session.commit()

        # Setup infrastructure
        building, floor, room = setup_test_data(session, org)
        session.commit()

        # Create entities
        entity_a, entity_b = create_test_entities(session, org)
        session.commit()

        # Create tag
        tag = create_test_tag(session, org)
        session.commit()

        # ============================================================
        # SCENARIO 1: Assign tag to Entity A, create location history
        # ============================================================
        print_section("📍 SCENARIO 1: Entity A with Tag")

        print_info("Step 1: Assigning tag to Entity A...")
        time_1 = datetime.now(timezone.utc) - timedelta(hours=2)

        # Manually create assignment (simulating what would happen in API)
        assignment_a1 = EntityTagAssignment(
            entity_id=entity_a.id,
            tag_id=tag.tag_id,
            assigned_at=time_1,
            unassigned_at=None
        )
        session.add(assignment_a1)
        tag.assigned_entity_id = entity_a.id
        session.commit()
        print_success(f"Tag assigned to Entity A at {time_1.strftime('%H:%M:%S')}")

        print_info("Step 2: Creating 5 location history entries for Entity A...")
        entries_a = create_location_history_entries(
            session, tag.tag_id, room.id, time_1 + timedelta(minutes=5), count=5
        )
        session.commit()
        print_success(f"Created {len(entries_a)} location entries")

        print_info("Step 3: Querying Entity A's location history...")
        history_a_before = get_entity_location_history(session, entity_a)
        print_success(f"Entity A sees {len(history_a_before)} location records")

        if len(history_a_before) != 5:
            print_error(f"Expected 5 records, got {len(history_a_before)}")
            return False

        # ============================================================
        # SCENARIO 2: Unassign tag from Entity A
        # ============================================================
        print_section("🔓 SCENARIO 2: Unassign Tag from Entity A")

        print_info("Step 1: Unassigning tag from Entity A...")
        # Make sure unassignment time is AFTER all location entries
        last_entry = entries_a[-1]
        time_2 = last_entry.exited_at + timedelta(minutes=10)

        # Close assignment
        assignment_a1.unassigned_at = time_2
        tag.assigned_entity_id = None
        session.commit()
        print_success(f"Tag unassigned from Entity A at {time_2.strftime('%H:%M:%S')}")

        print_info("Step 2: Querying Entity A's location history (after unassignment)...")
        history_a_after = get_entity_location_history(session, entity_a)
        print_success(f"Entity A still sees {len(history_a_after)} location records")

        if len(history_a_after) != 5:
            print_error(f"❌ FAIL: Entity A should still see 5 records, got {len(history_a_after)}")
            return False

        print_success("✓ TEST PASSED: Entity A keeps ALL history after unassignment!")

        # ============================================================
        # SCENARIO 3: Assign same tag to Entity B
        # ============================================================
        print_section("🔄 SCENARIO 3: Assign Same Tag to Entity B")

        print_info("Step 1: Assigning tag to Entity B...")
        time_3 = datetime.now(timezone.utc) - timedelta(minutes=30)

        # Create new assignment for Entity B
        assignment_b = EntityTagAssignment(
            entity_id=entity_b.id,
            tag_id=tag.tag_id,
            assigned_at=time_3,
            unassigned_at=None
        )
        session.add(assignment_b)
        tag.assigned_entity_id = entity_b.id
        session.commit()
        print_success(f"Tag assigned to Entity B at {time_3.strftime('%H:%M:%S')}")

        print_info("Step 2: Creating 3 NEW location history entries after Entity B assignment...")
        entries_b = create_location_history_entries(
            session, tag.tag_id, room.id, time_3 + timedelta(minutes=5), count=3
        )
        session.commit()
        print_success(f"Created {len(entries_b)} new location entries")

        print_info("Step 3: Querying Entity B's location history...")
        history_b = get_entity_location_history(session, entity_b)
        print_success(f"Entity B sees {len(history_b)} location records")

        if len(history_b) != 3:
            print_error(f"❌ FAIL: Entity B should only see 3 records (clean slate), got {len(history_b)}")
            return False

        print_success("✓ TEST PASSED: Entity B gets clean slate (only sees its own movements)!")

        # ============================================================
        # SCENARIO 4: Verify Entity A still has its history
        # ============================================================
        print_section("🔍 SCENARIO 4: Verify Entity A Still Has History")

        print_info("Querying Entity A's location history again...")
        history_a_final = get_entity_location_history(session, entity_a)
        print_success(f"Entity A sees {len(history_a_final)} location records")

        if len(history_a_final) != 5:
            print_error(f"❌ FAIL: Entity A should still see 5 records, got {len(history_a_final)}")
            return False

        print_success("✓ TEST PASSED: Entity A's history unchanged!")

        # ============================================================
        # FINAL SUMMARY
        # ============================================================
        print_section("📊 DETAILED RESULTS")

        print(f"\n{Colors.BOLD}Entity A Location History:{Colors.END}")
        for record in history_a_final:
            print(f"  • Room: {record.room_name}, Time: {record.entered_at.strftime('%H:%M:%S')}")

        print(f"\n{Colors.BOLD}Entity B Location History:{Colors.END}")
        for record in history_b:
            print(f"  • Room: {record.room_name}, Time: {record.entered_at.strftime('%H:%M:%S')}")

        print(f"\n{Colors.BOLD}Assignment History:{Colors.END}")
        assignments = session.query(EntityTagAssignment).filter(
            EntityTagAssignment.tag_id == tag.tag_id
        ).order_by(EntityTagAssignment.assigned_at).all()

        for assign in assignments:
            entity = session.query(Entity).get(assign.entity_id)
            status = "CURRENT" if assign.unassigned_at is None else "HISTORICAL"
            unassigned_str = assign.unassigned_at.strftime('%H:%M:%S') if assign.unassigned_at else "Still assigned"
            print(f"  • {entity.name}: {assign.assigned_at.strftime('%H:%M:%S')} → {unassigned_str} [{status}]")

        print_section("✅ ALL TESTS PASSED!")
        print_success("Location history is correctly preserved entity-wise")
        print_success("Entity A keeps history after unassignment")
        print_success("Entity B gets clean slate with new assignment")

        # Cleanup
        print_section("🧹 Cleaning Up Test Data")
        print_info("Deleting test data...")

        # Delete in reverse order of dependencies
        session.query(LocationHistory).filter(LocationHistory.tag_id == tag.tag_id).delete()
        session.query(EntityTagAssignment).filter(EntityTagAssignment.tag_id == tag.tag_id).delete()
        session.query(Tag).filter(Tag.tag_id == tag.tag_id).delete()
        session.query(Entity).filter(Entity.entity_id.in_(['TEST_ENTITY_A', 'TEST_ENTITY_B'])).delete()
        session.query(Room).filter(Room.id == room.id).delete()
        session.query(Floor).filter(Floor.id == floor.id).delete()
        session.query(Building).filter(Building.id == building.id).delete()

        session.commit()
        print_success("Test data cleaned up")

        return True

    except Exception as e:
        print_error(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        session.rollback()
        return False
    finally:
        session.close()


if __name__ == "__main__":
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}Entity-Wise Location History Preservation Test{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}\n")

    success = run_test_scenario()

    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 TEST SUITE PASSED{Colors.END}\n")
        sys.exit(0)
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ TEST SUITE FAILED{Colors.END}\n")
        sys.exit(1)
