import time
import requests
from datetime import datetime

# ---------------- CONFIG ----------------
TAG_ID = "E0:C0:74:C6:AD:C8"
ROOM_CHANGE_INTERVAL = 5  # Change room every 5 seconds
BACKEND_URL = "http://localhost:3000/api/events/location-event"

# Rooms to cycle through
ROOMS = ["Room 101", "Room 102", "Room 104", "Room 105"]

# ----------------------------------------

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def send_location_event(event_type, tag_id, to_room=None, from_room=None):
    """Send location event to backend API."""
    payload = {
        "event_type": event_type,
        "tag_id": tag_id,
        "timestamp": int(time.time())
    }

    if to_room:
        payload["to_room"] = to_room
    if from_room:
        payload["from_room"] = from_room

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=5)
        if response.status_code == 200:
            print(f"    ✓ Backend updated successfully")
            return True
        else:
            print(f"    ✗ Backend error: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"    ✗ Could not connect to backend at {BACKEND_URL}")
        return False
    except Exception as e:
        print(f"    ✗ Error sending to backend: {e}")
        return False

# ---------------- MAIN ----------------
print("=" * 60)
print(f"RTLS Simulator - Cycling through rooms every {ROOM_CHANGE_INTERVAL} seconds")
print(f"Tag: {TAG_ID}")
print(f"Rooms: {' → '.join(ROOMS)} (loop)")
print("=" * 60)
print()

# Send initial location
current_room_idx = 0
current_room = ROOMS[current_room_idx]

print(f"[{now()}] INITIAL LOCATION: {current_room}")
send_location_event("INITIAL_LOCATION", TAG_ID, to_room=current_room)
print()

# Cycle through rooms
while True:
    time.sleep(ROOM_CHANGE_INTERVAL)

    # Move to next room
    previous_room = current_room
    current_room_idx = (current_room_idx + 1) % len(ROOMS)
    current_room = ROOMS[current_room_idx]

    print(f"[{now()}] LOCATION CHANGE: {previous_room} → {current_room}")
    send_location_event("LOCATION_CHANGE", TAG_ID, from_room=previous_room, to_room=current_room)
    print()
