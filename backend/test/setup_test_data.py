"""
Setup script to prepare database for test.py simulation.
This creates the necessary tag, user, and rooms for the test to work.
"""
import requests
import sys

BASE_URL = "http://localhost:3000/api"
TAG_ID = "E0:C0:74:C6:AD:C8"

def check_backend():
    """Check if backend is running."""
    try:
        response = requests.get(f"{BASE_URL}/buildings", timeout=2)
        return response.status_code == 200
    except:
        return False

def get_or_create_building():
    """Get or create a test building."""
    # Try to get existing buildings
    response = requests.get(f"{BASE_URL}/buildings")
    buildings = response.json()

    if buildings:
        print(f"✓ Using existing building: {buildings[0]['name']}")
        return buildings[0]['id']

    # Create new building
    response = requests.post(f"{BASE_URL}/buildings", json={
        "name": "Test Building"
    })
    if response.status_code == 201:
        building = response.json()
        print(f"✓ Created building: {building['name']}")
        return building['id']
    else:
        print(f"✗ Failed to create building: {response.status_code} - {response.text}")
        sys.exit(1)

def get_or_create_floor(building_id):
    """Get or create a test floor."""
    response = requests.get(f"{BASE_URL}/floors?building_id={building_id}")
    floors = response.json()

    if floors:
        print(f"✓ Using existing floor: Floor {floors[0]['floor_number']}")
        return floors[0]['id']

    # Create new floor
    response = requests.post(f"{BASE_URL}/floors", json={
        "floor_number": 1,
        "building_id": building_id
    })
    if response.status_code == 201:
        floor = response.json()
        print(f"✓ Created floor: Floor {floor['floor_number']}")
        return floor['id']
    else:
        print(f"✗ Failed to create floor: {response.status_code} - {response.text}")
        sys.exit(1)

def create_rooms(floor_id):
    """Create test rooms that match GATEWAYS in test.py."""
    room_names = ["Room 101", "Room 102", "Room 104", "Room 105"]

    # Get existing rooms
    response = requests.get(f"{BASE_URL}/rooms?floor_id={floor_id}")
    existing_rooms = {room['room_name']: room for room in response.json()}

    created_count = 0
    for room_name in room_names:
        if room_name in existing_rooms:
            print(f"✓ Room already exists: {room_name}")
        else:
            response = requests.post(f"{BASE_URL}/rooms", json={
                "room_name": room_name,
                "room_type": "office",
                "floor_id": floor_id
            })
            if response.status_code == 201:
                print(f"✓ Created room: {room_name}")
                created_count += 1
            else:
                print(f"✗ Failed to create room: {room_name} - {response.text}")

    return created_count

def get_or_create_user():
    """Get or create a test user."""
    response = requests.get(f"{BASE_URL}/users")
    users = response.json()

    if users:
        print(f"✓ Using existing user: {users[0]['name']}")
        return users[0]['id']

    # Create new user
    response = requests.post(f"{BASE_URL}/users", json={
        "name": "Test User",
        "email": "test@example.com"
    })
    if response.status_code == 201:
        user = response.json()
        print(f"✓ Created user: {user['name']}")
        return user['id']
    else:
        print(f"✗ Failed to create user: {response.status_code} - {response.text}")
        sys.exit(1)

def create_tag(user_id):
    """Create or update tag."""
    # Try to get existing tag
    response = requests.get(f"{BASE_URL}/tags/{TAG_ID}")

    if response.status_code == 200:
        tag = response.json()
        if tag['assigned_user_id'] != user_id:
            # Update tag assignment
            response = requests.put(f"{BASE_URL}/tags/{TAG_ID}", json={
                "assigned_user_id": user_id,
                "status": "active"
            })
            print(f"✓ Updated existing tag: {TAG_ID}")
        else:
            print(f"✓ Tag already exists and is assigned: {TAG_ID}")
        return TAG_ID

    # Create new tag
    response = requests.post(f"{BASE_URL}/tags", json={
        "tag_id": TAG_ID,
        "assigned_user_id": user_id,
        "status": "active"
    })

    if response.status_code == 201:
        print(f"✓ Created tag: {TAG_ID}")
    else:
        print(f"✗ Failed to create tag: {response.status_code} - {response.text}")

    return TAG_ID

def main():
    print("=" * 60)
    print("Setting up test data for test.py simulation")
    print("=" * 60)
    print()

    # Check backend
    print("Checking backend connection...")
    if not check_backend():
        print("✗ Backend is not running at", BASE_URL)
        print("  Please start the backend first: cd backend && uvicorn app.main:app --reload")
        sys.exit(1)
    print("✓ Backend is running")
    print()

    # Create hierarchy
    print("Setting up building hierarchy...")
    building_id = get_or_create_building()
    floor_id = get_or_create_floor(building_id)
    create_rooms(floor_id)
    print()

    # Create user and tag
    print("Setting up user and tag...")
    user_id = get_or_create_user()
    create_tag(user_id)
    print()

    print("=" * 60)
    print("✓ Setup complete! You can now run test.py")
    print("=" * 60)
    print()
    print("To run the simulator:")
    print("  cd backend/test")
    print("  python test.py")
    print()
    print("To view locations on UI:")
    print("  1. Start frontend: cd frontend && npm start")
    print("  2. Open http://localhost:3000/live-positions")
    print("  3. You should see 'Test User' moving between rooms")

if __name__ == "__main__":
    main()
