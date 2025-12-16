"""
WebSocket manager - handles real-time connections and message broadcasting.
"""
from fastapi import WebSocket
from typing import Dict
import uuid
import logging
import asyncio
import time

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts messages to all connected clients.

    Design:
    - In-memory dictionary of active connections
    - UUID-based connection IDs
    - Graceful cleanup of dead connections
    - Periodic heartbeat to keep connections alive
    """

    def __init__(self):
        """Initialize WebSocket manager."""
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> str:
        """
        Accept WebSocket connection and assign unique ID.

        Args:
            websocket: FastAPI WebSocket object

        Returns:
            str: Unique connection ID
        """
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket connected: {connection_id} (total: {len(self.active_connections)})")
        return connection_id

    def disconnect(self, connection_id: str):
        """
        Remove connection from active connections.

        Args:
            connection_id: Connection ID to remove
        """
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            logger.info(f"WebSocket disconnected: {connection_id} (remaining: {len(self.active_connections)})")

    async def broadcast(self, message: dict):
        """
        Broadcast message to all active connections.

        Args:
            message: Dictionary to send as JSON

        Handles disconnected clients gracefully (removes from pool).
        """
        dead_connections = []

        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
                logger.debug(f"Message sent to {connection_id}: {message.get('type')}")
            except Exception as e:
                logger.warning(f"Failed to send to {connection_id}: {e}")
                dead_connections.append(connection_id)

        # Clean up dead connections
        for connection_id in dead_connections:
            self.disconnect(connection_id)

    async def send_heartbeat(self):
        """
        Background task: Send periodic heartbeat to keep connections alive.

        Runs every WS_HEARTBEAT_INTERVAL_SECONDS.
        """
        from app.config import settings

        while True:
            await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL_SECONDS)

            if self.active_connections:
                await self.broadcast({
                    "type": "HEARTBEAT",
                    "timestamp": int(time.time())
                })
                logger.debug(f"Heartbeat sent to {len(self.active_connections)} connections")


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
