"""
WebSocket endpoint for live tracking updates.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/live-tracking")
async def websocket_live_tracking(websocket: WebSocket):
    """
    WebSocket endpoint for live tracking updates.

    Clients connect and receive real-time location updates.

    Protocol:
    - Server sends location updates as JSON
    - Server sends periodic heartbeats to keep connection alive
    - Client can send messages (currently just echoed for debugging)
    """
    connection_id = await websocket_manager.connect(websocket)

    try:
        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_text()
            # Echo back (optional, for debugging)
            logger.debug(f"Received from {connection_id}: {data}")

    except WebSocketDisconnect:
        websocket_manager.disconnect(connection_id)
        logger.info(f"Client {connection_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for {connection_id}: {e}")
        websocket_manager.disconnect(connection_id)
