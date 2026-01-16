#!/bin/bash
# Quick start script for RTLS Backend (macOS optimized)
 
set -e
 
echo "🚀 RTLS Backend Quick Start (macOS)"
echo "===================================="
echo ""
 
# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  This script is optimized for macOS"
    echo "   Continuing anyway..."
    echo ""
fi
 
# Check if Docker Desktop is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Please install Docker Desktop for Mac:"
    echo "  https://www.docker.com/products/docker-desktop"
    echo ""
    echo "Or install via Homebrew:"
    echo "  brew install --cask docker"
    exit 1
fi
 
# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker Desktop is not running!"
    echo ""
    echo "Please start Docker Desktop:"
    echo "  1. Open Docker Desktop from Applications"
    echo "  2. Wait for it to start (whale icon in menu bar)"
    echo "  3. Run this script again"
    echo ""
    echo "Or start from command line:"
    echo "  open -a Docker"
    exit 1
fi
 
echo "✓ Docker Desktop is running"
echo ""
 
# Check if docker-compose is available (Docker Desktop includes it)
if ! docker compose version > /dev/null 2>&1 && ! docker-compose version > /dev/null 2>&1; then
    echo "❌ docker-compose is not available!"
    echo ""
    echo "Please update Docker Desktop to the latest version"
    exit 1
fi
 
# Use 'docker compose' (new) or 'docker-compose' (legacy)
if docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi
 
echo "✓ Using: $COMPOSE_CMD"
echo ""
 
# Check if PostgreSQL is accessible on port 5433
if nc -z localhost 5433 > /dev/null 2>&1; then
    echo "✓ PostgreSQL is already running on port 5433"
elif docker ps -a | grep -q rtls-postgres; then
    if docker ps | grep -q rtls-postgres; then
        echo "✓ PostgreSQL container is already running"
    else
        echo "Starting existing PostgreSQL container..."
        docker start rtls-postgres
        echo "Waiting for PostgreSQL to be ready..."
        sleep 3
    fi
else
    echo "Creating and starting PostgreSQL container..."
    $COMPOSE_CMD up -d
    echo "Waiting for PostgreSQL to be ready..."
 
    # Wait for PostgreSQL to be healthy (up to 30 seconds)
    for i in {1..30}; do
        if nc -z localhost 5433 > /dev/null 2>&1; then
            echo "✓ PostgreSQL is ready"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
fi
 
# Verify PostgreSQL is actually accessible
if command -v psql > /dev/null 2>&1; then
    if PGPASSWORD=rtls_password psql -h localhost -p 5433 -U rtls_user -d rtls_db -c "SELECT 1" > /dev/null 2>&1; then
        echo ""
        echo "✓ PostgreSQL is ready and accessible"
        echo ""
    else
        echo "⚠️  PostgreSQL is running but not accessible yet"
        echo "   Waiting a bit longer..."
        sleep 5
        if PGPASSWORD=rtls_password psql -h localhost -p 5433 -U rtls_user -d rtls_db -c "SELECT 1" > /dev/null 2>&1; then
            echo "✓ PostgreSQL is now accessible"
            echo ""
        else
            echo "❌ Cannot connect to PostgreSQL"
            echo ""
            echo "Try installing PostgreSQL client tools:"
            echo "  brew install postgresql@15"
            exit 1
        fi
    fi
else
    echo ""
    echo "⚠️  psql not found - skipping connection test"
    echo ""
    echo "To install PostgreSQL client tools:"
    echo "  brew install postgresql@15"
    echo ""
    echo "Assuming PostgreSQL is running..."
    echo ""
fi
 
# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed!"
    echo ""
    echo "Please install Python 3 via Homebrew:"
    echo "  brew install python@3.11"
    echo ""
    echo "Or download from https://www.python.org/downloads/mac-osx/"
    exit 1
fi
 
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✓ Found Python $PYTHON_VERSION"
echo ""
 
# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
 
echo ""
echo "Activating virtual environment..."
source venv/bin/activate
 
# Upgrade pip to avoid issues
pip install --upgrade pip --quiet
 
# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    echo "This may take a few minutes..."
    echo ""
 
    # Install dependencies with progress
    pip install -r requirements.txt
 
    echo ""
    echo "✓ Dependencies installed successfully"
else
    echo "✓ Dependencies already installed"
 
    # Check if requirements have changed
    echo "Checking for updated dependencies..."
    pip install -q -r requirements.txt --upgrade --upgrade-strategy only-if-needed
fi
 
echo ""
 
# Check if .env file exists, create from example if not
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Creating .env file from .env.example..."
        cp .env.example .env
        echo "✓ .env file created"
        echo ""
        echo "⚠️  IMPORTANT: Review .env file and update settings as needed"
        echo "   Especially update SMTP settings for email functionality"
        echo ""
    else
        echo "⚠️  No .env file found. Using default configuration."
        echo ""
    fi
else
    echo "✓ .env file exists"
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
echo "  🌐 http://localhost:3000"
echo "  📚 http://localhost:3000/docs (API documentation)"
echo "  📖 http://localhost:3000/redoc (Alternative docs)"
echo ""
echo "Database: PostgreSQL on port 5433"
echo "  Host: localhost"
echo "  Database: rtls_db"
echo "  User: rtls_user"
echo ""
echo "Press CTRL+C to stop the server"
echo ""
 
# Start the backend with macOS-friendly settings
echo "Starting uvicorn server..."
uvicorn app.main:app --host 127.0.0.1 --port 3000