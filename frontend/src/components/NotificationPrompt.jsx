import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  isPushSubscribed
} from '../utils/pushNotifications';
import { useToast } from '../contexts/ToastContext';
import './NotificationPrompt.css';

/**
 * Notification Prompt Component
 * Shows a banner prompting users to enable push notifications
 * Only shows if:
 * - Push notifications are supported
 * - User hasn't granted permission yet
 * - User hasn't dismissed the prompt in this session
 */
const NotificationPrompt = () => {
  const { success, error: showError } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkShouldShowPrompt();
  }, []);

  const checkShouldShowPrompt = async () => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem('notification-prompt-dismissed');
    if (dismissed) {
      return;
    }

    // Check if supported
    if (!isPushNotificationSupported()) {
      return;
    }

    // Check permission status
    const permission = getNotificationPermission();
    if (permission === 'granted') {
      // Already granted, check if subscribed
      const subscribed = await isPushSubscribed();
      if (subscribed) {
        return; // Already subscribed, don't show
      }
    } else if (permission === 'denied') {
      return; // User denied, don't annoy them
    }

    // Show the prompt
    setShowPrompt(true);
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      await subscribeToPushNotifications();
      success('Browser notifications enabled! You will now receive alerts.');
      setShowPrompt(false);
      sessionStorage.setItem('notification-prompt-dismissed', 'true');
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      showError(err.message || 'Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="notification-prompt">
      <div className="prompt-icon">
        <Bell size={24} />
      </div>

      <div className="prompt-content">
        <h3>Enable Browser Notifications</h3>
        <p>
          Stay informed about missing person alerts and important events
          even when you're not looking at this tab.
        </p>
      </div>

      <div className="prompt-actions">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="btn-enable"
        >
          {loading ? 'Enabling...' : 'Enable'}
        </button>
        <button
          onClick={handleDismiss}
          className="btn-dismiss"
          title="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
