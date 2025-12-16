# Docker Setup & Troubleshooting

## Issue: Docker Not Running

You're seeing this error because the Docker daemon (service) is not running.

### Solution: Start Docker Service

Run these commands in your terminal:

```bash
# Start Docker service
sudo systemctl start docker

# Enable Docker to start automatically on boot
sudo systemctl enable docker

# Check if Docker is running
sudo systemctl status docker
```

You should see "Active: active (running)" in the status output.

### Add Your User to Docker Group (Optional but Recommended)

This allows you to run Docker commands without `sudo`:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Apply the changes (or logout/login)
newgrp docker

# Test - this should work without sudo now
docker ps
```

### Verify Docker Works

```bash
# Test Docker
docker run hello-world

# This should download and run a test container
```

---

## After Docker is Running

Once Docker is running, start PostgreSQL:

```bash
cd /home/qss/Desktop/RTLS/backend

# Start PostgreSQL
docker-compose up -d

# Check if it's running
docker ps
```

You should see:
```
CONTAINER ID   IMAGE                COMMAND                  STATUS         PORTS                    NAMES
abc123...      postgres:15-alpine   "docker-entrypoint..."   Up 5 seconds   0.0.0.0:5432->5432/tcp   rtls-postgres
```

---

## Alternative: Run Without Docker

If you prefer not to use Docker, you can install PostgreSQL directly:

### Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### Create Database

```bash
# Access PostgreSQL as postgres user
sudo -u postgres psql

# In PostgreSQL shell, run:
CREATE DATABASE rtls_db;
CREATE USER rtls_user WITH PASSWORD 'rtls_password';
GRANT ALL PRIVILEGES ON DATABASE rtls_db TO rtls_user;
\q
```

### Update .env File

Make sure your `.env` file has:
```env
DATABASE_URL=postgresql://rtls_user:rtls_password@localhost:5432/rtls_db
```

### Then Continue with Backend Setup

```bash
cd /home/qss/Desktop/RTLS/backend

# Activate virtual environment
source venv/bin/activate

# Run migrations
alembic upgrade head

# Seed data
python scripts/seed-data.py

# Start backend
uvicorn app.main:app --reload --port 3000
```

---

## Quick Decision Guide

**Use Docker if:**
- ✅ You want easiest setup
- ✅ You want to easily reset/recreate database
- ✅ You want isolated environment
- ✅ You're comfortable with Docker

**Use Manual PostgreSQL if:**
- ✅ Docker is causing issues
- ✅ You prefer traditional setup
- ✅ You already have PostgreSQL installed
- ✅ You want system-level database

Both options work perfectly fine! Choose what's most comfortable for you.

---

## Common Docker Issues

### "permission denied while trying to connect to the Docker daemon socket"

```bash
# Solution 1: Use sudo
sudo docker-compose up -d

# Solution 2: Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### "Cannot connect to the Docker daemon"

```bash
# Start Docker service
sudo systemctl start docker

# Check status
sudo systemctl status docker
```

### "Port 5432 already in use"

PostgreSQL might already be running on your system:

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Stop it (if you want to use Docker)
sudo systemctl stop postgresql

# Or use a different port in docker-compose.yml:
# Change "5432:5432" to "5433:5432"
# Then update DATABASE_URL to use port 5433
```

### "Container name already exists"

```bash
# Remove existing container
docker rm -f rtls-postgres

# Or remove all stopped containers
docker container prune

# Then start again
docker-compose up -d
```

---

## Useful Commands

### Docker Service
```bash
# Start Docker
sudo systemctl start docker

# Stop Docker
sudo systemctl stop docker

# Restart Docker
sudo systemctl restart docker

# Check status
sudo systemctl status docker
```

### Docker Compose
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Remove everything (including volumes)
docker-compose down -v
```

### Docker Containers
```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop a container
docker stop rtls-postgres

# Remove a container
docker rm rtls-postgres

# View container logs
docker logs rtls-postgres

# Execute command in container
docker exec -it rtls-postgres bash
```

---

## Get Help

If you're still having issues:

1. Check Docker logs: `sudo journalctl -u docker`
2. Check container logs: `docker-compose logs postgres`
3. Verify Docker version: `docker --version` (should be 20.10+)
4. Try the manual PostgreSQL installation instead
