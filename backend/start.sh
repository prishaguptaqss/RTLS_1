#!/bin/bash
# Quick start script for RTLS Backend

set -e

echo "🚀 RTLS Backend Quick Start"
echo "============================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker first:"
    echo "  sudo systemctl start docker"
    echo ""
    echo "Or install PostgreSQL manually (see DOCKER-SETUP.md)"
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Check if PostgreSQL is accessible on port 5433
if pg_isready -h localhost -p 5433 -U rtls_user > /dev/null 2>&1 || nc -z localhost 5433 > /dev/null 2>&1; then
    echo "✓ PostgreSQL is already running on port 5433"
elif docker ps -a | grep -q rtls-postgres; then
    if docker ps | grep -q rtls-postgres; then
        echo "✓ PostgreSQL container is already running"
    else
        echo "Starting existing PostgreSQL container..."
        docker start rtls-postgres || {
            echo "⚠️  Failed to start container, but PostgreSQL may already be running"
            echo "   Checking database connection..."
        }
    fi
else
    echo "Creating and starting PostgreSQL container..."
    docker-compose up -d || {
        echo "⚠️  Docker compose failed, checking if PostgreSQL is already accessible..."
    }
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Verify PostgreSQL is actually accessible
if command -v psql > /dev/null 2>&1; then
    if PGPASSWORD=rtls_password psql -h localhost -p 5433 -U rtls_user -d rtls_db -c "SELECT 1" > /dev/null 2>&1; then
        echo ""
        echo "✓ PostgreSQL is ready and accessible"
        echo ""
    else
        echo "❌ PostgreSQL is not accessible"
        exit 1
    fi
else
    echo ""
    echo "✓ PostgreSQL appears to be running (skipping connection test - psql not installed)"
    echo ""
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -q -r requirements.txt
else
    echo "✓ Dependencies already installed"
fi

echo ""

# Check if migrations have been run
if ! python -c "from alembic.config import Config; from alembic import command; cfg = Config('alembic.ini'); command.current(cfg)" 2>/dev/null | grep -q "Rev"; then
    echo "Running database migrations..."
    alembic upgrade head
else
    echo "✓ Database migrations are up to date"
fi

echo ""

# Ask about seeding data
read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    python scripts/seed-data.py
fi

echo ""
echo "========================================="
echo "✅ Setup complete! Starting backend..."
echo "========================================="
echo ""
echo "Backend will be available at:"
echo "  http://localhost:3000"
echo "  http://localhost:3000/docs (API documentation)"
echo ""
echo "Press CTRL+C to stop the server"
echo ""

# Start the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
