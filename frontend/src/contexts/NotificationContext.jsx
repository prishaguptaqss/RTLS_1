import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocket';
import { getUnreadCount } from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    // Only fetch if we have an auth token
    const token = localStorage.getItem('authToken');
    if (!token) {
      return;
    }

    try {
      const data = await getUnreadCount();
      setUnreadCount(data.count);
    } catch (error) {
      // Only log if it's not a 401 (unauthorized) error
      if (error.response?.status !== 401) {
        console.error('[NotificationContext] Failed to fetch unread count:', error);
      }
    }
  }, []);

  // Initial fetch on mount - only when authenticated
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Listen for WebSocket MISSING_PERSON events
  useEffect(() => {
    const unsubscribe = websocketService.on('MISSING_PERSON', (notification) => {
      console.log('[NotificationContext] Received MISSING_PERSON notification:', notification);

      // Increment unread count
      setUnreadCount(prev => prev + 1);

      // Store latest notification for potential display
      setLatestNotification(notification);

      // Optional: Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const displayName = notification.entity_name || notification.user_name || 'Unknown';
        const title = 'Missing Person Alert';
        const body = `${displayName} missing from ${notification.last_room || 'Unknown location'}`;

        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `missing-person-${notification.tag_id}`,
          requireInteraction: true
        });
      }
    });

    return unsubscribe;
  }, []);

  // Refresh unread count (called after marking as read/unread)
  const refreshUnreadCount = useCallback(async () => {
    await fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('[NotificationContext] Notification permission:', permission);
        return permission === 'granted';
      } catch (error) {
        console.error('[NotificationContext] Failed to request notification permission:', error);
        return false;
      }
    }
    return Notification.permission === 'granted';
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        latestNotification,
        refreshUnreadCount,
        requestNotificationPermission
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
