"""
FastAPI main application entry point.
Configures routes, CORS, and lifecycle events.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import (
    users,
    organizations,
    entities,
    buildings,
    floors,
    rooms,
    tags,
    devices,
    positions,
    dashboard,
    events,
    websocket,
    settings as settings_api
)
from app.services.missing_person_detector import missing_person_detector
from app.services.websocket_manager import websocket_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.

    Startup:
    - Create database tables (if not exists)
    - Start missing person detection background task
    - Start WebSocket heartbeat task

    Shutdown:
    - Cancel background tasks
    - Close database connections
    """
    # Startup
    logger.info("Starting RTLS Backend...")

    # Create tables (Note: In production, use Alembic migrations instead)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified")

    # Start background tasks
    db = SessionLocal()
    missing_person_task = asyncio.create_task(missing_person_detector.run(db))
    heartbeat_task = asyncio.create_task(websocket_manager.send_heartbeat())
    logger.info("Background tasks started")

    yield

    # Shutdown
    logger.info("Shutting down RTLS Backend...")
    missing_person_task.cancel()
    heartbeat_task.cancel()
    db.close()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="RTLS Entity Tracking API",
    description="Real-Time Location System for tracking persons and materials across organizations",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Organization-ID"],
)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["Organizations"])
app.include_router(entities.router, prefix="/api/entities", tags=["Entities"])
app.include_router(buildings.router, prefix="/api/buildings", tags=["Buildings"])
app.include_router(floors.router, prefix="/api/floors", tags=["Floors"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(tags.router, prefix="/api/tags", tags=["Tags"])
app.include_router(devices.router, prefix="/api/devices", tags=["Devices"])
app.include_router(positions.router, prefix="/api/positions", tags=["Live Positions"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["Settings"])


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "rtls-backend",
        "version": "1.0.0"
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "RTLS Entity Tracking API",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_url": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,  # Disable in production
        log_level="info"
    )
