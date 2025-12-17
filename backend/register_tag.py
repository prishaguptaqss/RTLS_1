#!/usr/bin/env python3
"""
Quick script to register a tag in the database via API
Usage: python3 register_tag.py <tag_id> <user_id>
"""
import sys
import requests

BACKEND_URL = "http://localhost:3000/api"

def register_tag(tag_id, user_id):
    """Register a tag and assign it to a user"""

    # First, check if user exists
    print(f"Checking if user '{user_id}' exists...")
    response = requests.get(f"{BACKEND_URL}/users/{user_id}")

    if response.status_code == 404:
        print(f"❌ User '{user_id}' not found. Please create the user first.")
        print(f"   Go to: http://localhost:5173/users")
        return False

    user_data = response.json()
    print(f"✓ User found: {user_data['name']}")

    # Check if tag already exists
    print(f"\nChecking if tag '{tag_id}' exists...")
    response = requests.get(f"{BACKEND_URL}/tags/{tag_id}")

    if response.status_code == 200:
        # Tag exists, update it
        print(f"Tag already exists. Updating assignment...")
        tag_data = {
            "assigned_user_id": user_id,
            "status": "active"
        }
        response = requests.put(f"{BACKEND_URL}/tags/{tag_id}", json=tag_data)

        if response.status_code == 200:
            print(f"✓ Tag '{tag_id}' updated and assigned to '{user_id}'")
            return True
        else:
            print(f"❌ Failed to update tag: {response.text}")
            return False
    else:
        # Tag doesn't exist, create it
        print(f"Tag not found. Creating new tag...")
        tag_data = {
            "tag_id": tag_id,
            "assigned_user_id": user_id,
            "status": "active"
        }
        response = requests.post(f"{BACKEND_URL}/tags", json=tag_data)

        if response.status_code == 201:
            print(f"✓ Tag '{tag_id}' created and assigned to '{user_id}'")
            return True
        else:
            print(f"❌ Failed to create tag: {response.text}")
            return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 register_tag.py <tag_id> <user_id>")
        print("\nExample:")
        print("  python3 register_tag.py E2:D5:A0:F5:79:99 mohit")
        print("  python3 register_tag.py E0:C0:74:C6:AD:C8 EMP-001")
        sys.exit(1)

    tag_id = sys.argv[1]
    user_id = sys.argv[2]

    print("=" * 60)
    print(f"Registering Tag: {tag_id}")
    print(f"Assigning to User: {user_id}")
    print("=" * 60)

    success = register_tag(tag_id, user_id)

    if success:
        print("\n" + "=" * 60)
        print("SUCCESS! Tag is now registered and tracking will work.")
        print(f"Check the frontend at: http://localhost:5173/live-positions")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("FAILED! Please check the errors above and try again.")
        print("=" * 60)
        sys.exit(1)
