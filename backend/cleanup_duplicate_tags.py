#!/usr/bin/env python3
"""
Cleanup script to remove duplicate uppercase tags created by MQTT script.
This merges location data from uppercase tags into their lowercase counterparts.
"""
from app.database import SessionLocal
from app.models.tag import Tag
from app.models.live_location import LiveLocation
from app.models.location_history import LocationHistory

def cleanup_duplicate_tags():
    db = SessionLocal()

    try:
        # Find the duplicate tags
        lowercase_tag = db.query(Tag).filter(Tag.tag_id == 'e2:d5:a0:f5:79:99').first()
        uppercase_tag = db.query(Tag).filter(Tag.tag_id == 'E2:D5:A0:F5:79:99').first()

        if not uppercase_tag:
            print("✓ No uppercase duplicate found - already clean!")
            return

        if not lowercase_tag:
            print("✗ Error: Lowercase tag not found, cannot merge")
            return

        print(f"Found duplicate tags:")
        print(f"  Lowercase: {lowercase_tag.tag_id} (entity_id={lowercase_tag.assigned_entity_id})")
        print(f"  Uppercase: {uppercase_tag.tag_id} (entity_id={uppercase_tag.assigned_entity_id})")

        # Move live location from uppercase to lowercase
        uppercase_live = db.query(LiveLocation).filter(LiveLocation.tag_id == 'E2:D5:A0:F5:79:99').first()
        lowercase_live = db.query(LiveLocation).filter(LiveLocation.tag_id == 'e2:d5:a0:f5:79:99').first()

        if uppercase_live:
            if lowercase_live:
                # Update existing lowercase live location with uppercase data
                lowercase_live.room_id = uppercase_live.room_id
                lowercase_live.updated_at = uppercase_live.updated_at
                lowercase_live.organization_id = uppercase_live.organization_id
                print(f"  ✓ Merged live location to lowercase tag")
                # Delete uppercase live location
                db.delete(uppercase_live)
            else:
                # Just change the tag_id
                uppercase_live.tag_id = 'e2:d5:a0:f5:79:99'
                print(f"  ✓ Moved live location to lowercase tag")

        # Move location history from uppercase to lowercase
        uppercase_histories = db.query(LocationHistory).filter(LocationHistory.tag_id == 'E2:D5:A0:F5:79:99').all()
        for history in uppercase_histories:
            history.tag_id = 'e2:d5:a0:f5:79:99'
        print(f"  ✓ Moved {len(uppercase_histories)} history records to lowercase tag")

        # Delete the uppercase tag
        db.delete(uppercase_tag)
        print(f"  ✓ Deleted uppercase duplicate tag")

        db.commit()
        print(f"\n✓ Cleanup complete!")

        # Verify
        print(f"\nVerification:")
        remaining_tag = db.query(Tag).filter(Tag.tag_id == 'e2:d5:a0:f5:79:99').first()
        if remaining_tag:
            print(f"  ✓ Tag: {remaining_tag.tag_id}")
            print(f"    entity_id: {remaining_tag.assigned_entity_id}")

            live = db.query(LiveLocation).filter(LiveLocation.tag_id == 'e2:d5:a0:f5:79:99').first()
            if live:
                print(f"    Live location: room_id={live.room_id}")

            uppercase_check = db.query(Tag).filter(Tag.tag_id == 'E2:D5:A0:F5:79:99').first()
            if uppercase_check:
                print(f"  ✗ ERROR: Uppercase tag still exists!")
            else:
                print(f"  ✓ No uppercase duplicate remains")

    except Exception as e:
        print(f"✗ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicate_tags()
