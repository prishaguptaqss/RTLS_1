# 🚀 Quick Start Guide - RTLS Backend

Get your RTLS backend running in **5 minutes** using Docker!

## Prerequisites

- ✅ Docker and Docker Compose installed ([Install Docker](https://docs.docker.com/get-docker/))
- ✅ Python 3.11+ installed
- ✅ Git (already have the code)

## Step-by-Step Setup

### 1️⃣ Start Docker Service

First, make sure Docker is running:

```bash
# Start Docker service
sudo systemctl start docker

# Verify Docker is running
docker info
```

If you get "permission denied", add your user to the docker group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 2️⃣ Start PostgreSQL Database

```bash
cd /home/qss/Desktop/RTLS/backend

# Start PostgreSQL in Docker (runs in background)
docker-compose up -d

# Verify it's running (you should see rtls-postgres)
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE                COMMAND                  STATUS         PORTS                    NAMES
abc123def456   postgres:15-alpine   "docker-entrypoint.s…"   Up 5 seconds   0.0.0.0:5432->5432/tcp   rtls-postgres
```

### 2️⃣ Set Up Python Backend

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies (takes ~30 seconds)
pip install -r requirements.txt
```

### 3️⃣ Create Database Tables

```bash
# Run migrations to create all tables
alembic upgrade head

# You should see:
# INFO  [alembic.runtime.migration] Running upgrade  -> xxxxx, Initial migration
```

### 4️⃣ Add Sample Data (Optional but Recommended)

```bash
# This creates sample users, rooms, and tags for testing
python scripts/seed-data.py
```

**Expected output:**
```
Seeding database...
✓ Created building: Main Hospital
✓ Created floors: 1, 2
✓ Created 7 rooms
✓ Created 5 anchors
✓ Created 3 users
✓ Created 3 tags

✅ Database seeding completed successfully!
```

### 5️⃣ Start the Backend

```bash
# Start FastAPI server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:3000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 6️⃣ Test It Works

Open your browser and visit:
- 📖 **API Docs**: http://localhost:3000/docs
- 🏥 **Health Check**: http://localhost:3000/health
- 📊 **Dashboard Stats**: http://localhost:3000/api/dashboard/stats

Or use curl:
```bash
# Test dashboard
curl http://localhost:3000/api/dashboard/stats

# Expected: {"totalUsers":3,"totalBuildings":1,"totalRooms":7,"totalDevices":5,"activeTags":3,"offlineTags":0}
```

---

## ✅ You're Done!

The backend is now running and ready to:
- ✅ Receive events from Python MQTT service
- ✅ Serve data to the React frontend
- ✅ Broadcast real-time updates via WebSocket

---

## 🔗 Next Steps

### Connect Your Python MQTT Script

Add this to your Python script to send events to the backend:

```python
import requests

BACKEND_URL = "http://localhost:3000/api/location-event"

def send_event_to_backend(event_type, tag_id, **kwargs):
    event = {
        "event_type": event_type,
        "tag_id": tag_id,
        "timestamp": int(time.time()),
        **kwargs
    }
    try:
        response = requests.post(BACKEND_URL, json=event, timeout=5)
        response.raise_for_status()
        print(f"✓ Event sent: {event_type} for {tag_id}")
    except Exception as e:
        print(f"✗ Failed to send event: {e}")

# Example usage:
send_event_to_backend(
    event_type="INITIAL_LOCATION",
    tag_id="E0:C0:74:C6:AD:C8",
    to_room="Room 101"
)
```

### Test Event Ingestion

```bash
# Send a test event
curl -X POST http://localhost:3000/api/location-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "INITIAL_LOCATION",
    "tag_id": "E0:C0:74:C6:AD:C8",
    "to_room": "Room 101",
    "timestamp": 1734331200
  }'

# Expected: {"status":"success","message":"Initial location recorded","tag_id":"E0:C0:74:C6:AD:C8"}
```

### Start the Frontend

```bash
cd /home/qss/Desktop/RTLS/frontend
npm install
npm run dev
```

Frontend will be at: http://localhost:5173

---

## 🛠 Useful Commands

### Docker Commands

```bash
# View PostgreSQL logs
docker-compose logs -f postgres

# Access PostgreSQL shell
docker exec -it rtls-postgres psql -U rtls_user -d rtls_db

# Stop PostgreSQL
docker-compose down

# Reset database (WARNING: deletes all data!)
docker-compose down -v
docker-compose up -d
alembic upgrade head
python scripts/seed-data.py
```

### Backend Commands

```bash
# Activate virtual environment
source venv/bin/activate

# Run backend
uvicorn app.main:app --reload --port 3000

# Run migrations
alembic upgrade head

# Create new migration (after model changes)
alembic revision --autogenerate -m "Description"

# Seed data
python scripts/seed-data.py
```

---

## 🐛 Troubleshooting

### "Connection refused" to database

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d

# Check logs for errors
docker-compose logs postgres
```

### "Port 3000 already in use"

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process or use a different port
uvicorn app.main:app --reload --port 8000

# Update PORT in .env file
```

### "Alembic command not found"

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Can't access http://localhost:3000

```bash
# Check if backend is running
ps aux | grep uvicorn

# Check logs for errors in terminal where uvicorn is running

# Try accessing from same machine
curl http://localhost:3000/health
```

---

## 📚 Documentation

- **Full README**: [README.md](README.md) - Complete documentation
- **API Docs**: http://localhost:3000/docs - Interactive API documentation
- **Plan File**: [/home/qss/.claude/plans/velvety-churning-robin.md](../../.claude/plans/velvety-churning-robin.md) - Implementation plan

---

## 🎉 Success Checklist

- [ ] PostgreSQL running in Docker (`docker ps` shows rtls-postgres)
- [ ] Virtual environment activated (`(venv)` in terminal prompt)
- [ ] Dependencies installed (`pip list` shows fastapi, sqlalchemy, etc.)
- [ ] Migrations applied (`alembic current` shows revision)
- [ ] Sample data loaded (visit http://localhost:3000/api/users)
- [ ] Backend running (`uvicorn` command running)
- [ ] API docs accessible (http://localhost:3000/docs)
- [ ] Health check returns OK (http://localhost:3000/health)

All checked? **You're ready to go!** 🚀
