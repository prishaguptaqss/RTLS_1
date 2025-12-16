# RTLS Hospital Tracking Backend

Real-Time Location System (RTLS) backend for hospital patient and staff tracking using BLE beacons and ESP32 gateways.

## Overview

This FastAPI backend processes location events from a Python MQTT service and provides:
- Real-time location tracking via WebSocket
- RESTful APIs for managing users, rooms, tags, and devices
- Historical location data and analytics
- Missing person detection and alerts

## Architecture

```
Python MQTT Service (BLE Data)
    ↓ HTTP POST
FastAPI Backend (this project)
    ↓ WebSocket
React Frontend
```

### Components

- **FastAPI**: Web framework for async Python
- **PostgreSQL**: Relational database for all data
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migration management
- **WebSocket**: Real-time updates to frontend
- **Pydantic**: Request/response validation

## Quick Start

### Option 1: Docker Setup (Recommended)

This is the easiest way to get started - PostgreSQL runs in Docker, no manual installation needed.

#### Prerequisites
- Docker and Docker Compose installed
- Python 3.11+ (for running backend locally)

#### Steps

1. **Start PostgreSQL with Docker**:
```bash
cd /home/qss/Desktop/RTLS/backend

# Start PostgreSQL container
docker-compose up -d

# Check if PostgreSQL is running
docker ps
```

2. **Set up Python backend**:
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Environment is already configured for Docker PostgreSQL
# DATABASE_URL in .env is: postgresql://rtls_user:rtls_password@localhost:5432/rtls_db
```

3. **Run database migrations**:
```bash
# Create tables
alembic upgrade head

# Seed initial data (optional)
python scripts/seed-data.py
```

4. **Start the backend**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

That's it! The backend is running at http://localhost:3000

#### Docker Commands

```bash
# Start PostgreSQL
docker-compose up -d

# Stop PostgreSQL
docker-compose down

# View logs
docker-compose logs -f postgres

# Access PostgreSQL shell
docker exec -it rtls-postgres psql -U rtls_user -d rtls_db

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
alembic upgrade head
python scripts/seed-data.py
```

---

### Option 2: Full Docker Setup (Backend + Database)

Run both backend and database in Docker containers:

```bash
# Build and start all services
docker-compose -f docker-compose.dev.yml up --build

# Run in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

The backend will be available at http://localhost:3000

---

### Option 3: Manual PostgreSQL Installation

If you prefer to install PostgreSQL directly on your system:

#### Prerequisites
- Python 3.11+
- PostgreSQL 15+

#### Database Setup

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE rtls_db;
CREATE USER rtls_user WITH PASSWORD 'rtls_password';
GRANT ALL PRIVILEGES ON DATABASE rtls_db TO rtls_user;
\q
```

#### Backend Installation

```bash
cd /home/qss/Desktop/RTLS/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

Update `.env` with your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://rtls_user:rtls_password@localhost:5432/rtls_db
```

#### Database Migration

```bash
# Apply migrations
alembic upgrade head
```

#### Seed Data

```bash
# Seed initial data for testing
python scripts/seed-data.py
```

This creates:
- 1 building (Main Hospital)
- 2 floors
- 7 rooms (Room 101-105, Room 201-202)
- 5 anchors (ESP32 gateways)
- 3 users (Piyush, Manish, Sanchit)
- 3 tags (BLE beacons)

#### Run Backend

```bash
# Development mode (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 3000 --workers 4
```

The backend will be available at:
- API: http://localhost:3000
- Interactive docs: http://localhost:3000/docs
- Health check: http://localhost:3000/health

## API Endpoints

### Event Ingestion (Python MQTT Service)

**POST /api/location-event**
```json
{
  "event_type": "LOCATION_CHANGE",
  "tag_id": "E0:C0:74:C6:AD:C8",
  "from_room": "Room 101",
  "to_room": "Room 102",
  "timestamp": 1734331200
}
```

Event types:
- `LOCATION_CHANGE`: Tag moved between rooms
- `INITIAL_LOCATION`: First detection of tag
- `TAG_LOST`: Tag not seen for X seconds

### Live Tracking

- `GET /api/positions/live` - Current positions of all active tags
- `WS /ws/live-tracking` - WebSocket for real-time updates

### CRUD Operations

- `GET/POST/PUT/DELETE /api/users` - User management
- `GET/POST/PUT/DELETE /api/buildings` - Building management
- `GET/POST/PUT/DELETE /api/floors` - Floor management
- `GET/POST/PUT/DELETE /api/rooms` - Room management
- `GET/POST/PUT/DELETE /api/tags` - Tag management
- `GET/POST/PUT/DELETE /api/devices` - Device (anchor) management

### Analytics

- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/location-history?tag_id={id}` - Historical movement data

## Python MQTT Service Integration

Your Python MQTT service needs to send HTTP POST requests to this backend.

### Modify Your Python Script

Add this function to your Python MQTT script:

```python
import requests
import time

BACKEND_URL = "http://localhost:3000/api/location-event"

def send_event_to_backend(event_type, tag_id, **kwargs):
    """Send location event to FastAPI backend."""
    event = {
        "event_type": event_type,
        "tag_id": tag_id,
        "timestamp": int(time.time()),
        **kwargs
    }
    try:
        response = requests.post(BACKEND_URL, json=event, timeout=5)
        response.raise_for_status()
        print(f"Event sent to backend: {event_type} for {tag_id}")
    except Exception as e:
        print(f"Failed to send event to backend: {e}")
```

Then call it when location changes:

```python
# For initial location
send_event_to_backend(
    event_type="INITIAL_LOCATION",
    tag_id=mac,
    to_room=best_gw
)

# For location change
send_event_to_backend(
    event_type="LOCATION_CHANGE",
    tag_id=mac,
    from_room=prev,
    to_room=best_gw
)

# For tag lost
send_event_to_backend(
    event_type="TAG_LOST",
    tag_id=mac,
    last_room=prev_best
)
```

## Configuration

All configuration is done via environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://rtls_user:password@localhost:5432/rtls_db

# Server
HOST=0.0.0.0
PORT=3000

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:5174

# Missing Person Detection
MISSING_PERSON_THRESHOLD_SECONDS=300  # 5 minutes
MISSING_PERSON_CHECK_INTERVAL_SECONDS=30

# WebSocket
WS_HEARTBEAT_INTERVAL_SECONDS=30

# Database Connection Pool
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_RECYCLE=3600
DB_POOL_PRE_PING=true
```

## Testing

### Manual Testing

Test event ingestion:
```bash
curl -X POST http://localhost:3000/api/location-event \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "INITIAL_LOCATION",
    "tag_id": "E0:C0:74:C6:AD:C8",
    "to_room": "Room 101",
    "timestamp": 1734331200
  }'
```

Test live positions:
```bash
curl http://localhost:3000/api/positions/live | jq
```

Test WebSocket:
```bash
npm install -g wscat
wscat -c ws://localhost:3000/ws/live-tracking
```

## Project Structure

```
backend/
├── app/
│   ├── models/          # SQLAlchemy ORM models
│   ├── schemas/         # Pydantic validation schemas
│   ├── api/             # API route handlers
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── config.py        # Configuration
│   ├── database.py      # Database connection
│   └── main.py          # FastAPI application
├── alembic/             # Database migrations
├── requirements.txt     # Python dependencies
├── .env                 # Environment configuration
└── README.md           # This file
```

## Troubleshooting

### Database Connection Errors

**With Docker:**
```bash
# Check if container is running
docker ps

# Check logs
docker-compose logs postgres

# Restart container
docker-compose restart postgres

# If still issues, recreate container
docker-compose down
docker-compose up -d
```

**With manual PostgreSQL:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Port Already in Use

If port 3000 is already in use:
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process (replace PID)
kill -9 PID

# Or change PORT in .env file
PORT=8000
```

### Room Cache Issues

If room lookups are failing, clear the cache:
```python
from app.services.room_cache import room_cache
room_cache.invalidate()  # Clear entire cache
```

## Production Deployment

For production deployment:

1. **Disable debug mode**:
   - Remove `--reload` from uvicorn command
   - Set `echo=False` in `database.py`

2. **Use process manager**:
   ```bash
   # Install supervisor
   sudo apt install supervisor

   # Create config /etc/supervisor/conf.d/rtls.conf
   [program:rtls]
   command=/home/qss/Desktop/RTLS/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3000 --workers 4
   directory=/home/qss/Desktop/RTLS/backend
   user=qss
   autostart=true
   autorestart=true
   ```

3. **Use reverse proxy** (Nginx):
   ```nginx
   server {
       listen 80;
       server_name rtls.hospital.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /ws {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

4. **Enable SSL** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d rtls.hospital.com
   ```

## License

Proprietary - Hospital RTLS System

## Support

For issues or questions, contact the development team.
