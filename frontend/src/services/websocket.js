/**
 * WebSocket Service for real-time notifications
 * Singleton service that manages WebSocket connection and message distribution
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectInterval = 3000;
    this.reconnectTimer = null;
    this.url = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL (optional, uses env var if not provided)
   */
  connect(url) {
    // Get organization ID from localStorage for filtering
    const orgId = localStorage.getItem('currentOrganizationId');

    // Build WebSocket URL
    this.url = url || import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/live-tracking';

    console.log(`[WebSocket] Connecting to ${this.url}...`);

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected successfully');
      this.clearReconnectTimer();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Filter messages by organization (if organization_id is present)
        if (message.organization_id && orgId) {
          const messageOrgId = parseInt(message.organization_id);
          const currentOrgId = parseInt(orgId);

          if (messageOrgId !== currentOrgId) {
            // Ignore messages from other organizations
            return;
          }
        }

        // Notify all listeners for this message type
        const listeners = this.listeners.get(message.type) || [];
        listeners.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error(`[WebSocket] Error in listener for ${message.type}:`, error);
          }
        });
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected, scheduling reconnect...');
      this.scheduleReconnect();
    };
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Schedule automatic reconnection
   */
  scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      console.log('[WebSocket] Attempting to reconnect...');
      this.connect(this.url);
    }, this.reconnectInterval);
  }

  /**
   * Clear reconnection timer
   */
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Subscribe to a specific message type
   * @param {string} type - Message type (e.g., 'MISSING_PERSON', 'LOCATION_UPDATE')
   * @param {Function} callback - Callback function to handle messages
   * @returns {Function} Unsubscribe function
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    this.listeners.get(type).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
