# RTLS Test Script Setup

## How to Configure Organization ID

### Step 1: Find Your Organization ID

**Option A - Via Frontend UI:**
1. Open http://localhost:5174/
2. Go to "Organizations" page
3. Your organization ID is the number in the URL or visible in the table

**Option B - Via Database:**
```bash
# Connect to PostgreSQL
PGPASSWORD=password psql -h localhost -U rtls_user -d rtls_db -c "SELECT id, org_id, name FROM organizations;"
```

**Option C - Via API:**
```bash
curl http://localhost:3000/api/organizations/
```

### Step 2: Update test.py

Open `/home/qss/Desktop/RTLS/backend/test/test.py` and change line 106:

```python
ORGANIZATION_ID = 1  # Change this to your actual organization ID
```

### Step 3: Verify Setup

Before running the script, ensure:
- ✅ Organization exists in the database
- ✅ Buildings/Floors/Rooms are created for that organization
- ✅ Room names match your ESP32 gateway names exactly
- ✅ Tags are registered (optional but recommended)

### Step 4: Run the Script

```bash
cd /home/qss/Desktop/RTLS/backend/test
python3 test.py
```

## Quick Setup Example

```bash
# 1. Check organizations
curl http://localhost:3000/api/organizations/

# Output example:
# [{"id": 1, "org_id": "hospital-1", "name": "Hospital A"}]
#          ↑
#    Use this ID

# 2. Update test.py
nano test.py
# Change: ORGANIZATION_ID = 1

# 3. Run
python3 test.py
```

## Troubleshooting

### Error: "Organization ID required"
- Make sure `ORGANIZATION_ID` is set in test.py
- Check the organization exists: `curl http://localhost:3000/api/organizations/`

### Error: "Room not found"
- Create rooms in the frontend with names matching your gateway names
- Go to Locations → Add Building → Add Floor → Add Rooms

### Error: "Tag not found"
- Tags are auto-created, but you can register them manually in Devices → Tags

## Configuration Variables

In `test.py`, you can configure:

```python
BROKER = "192.168.1.232"          # MQTT broker IP
PORT = 1883                       # MQTT port
TOPIC = "Hospital"                # MQTT topic
ORGANIZATION_ID = 1               # YOUR ORGANIZATION ID ← CHANGE THIS
BACKEND_URL = "http://192.168.1.204:3000/api/events/location-event"
```
