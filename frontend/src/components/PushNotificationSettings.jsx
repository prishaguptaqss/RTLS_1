import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, AlertCircle } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  showTestNotification
} from '../utils/pushNotifications';
import { useToast } from '../contexts/ToastContext';
import './PushNotificationSettings.css';

const PushNotificationSettings = () => {
  const { success, error: showError, info } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check support and subscription status on mount
  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = getNotificationPermission();
      setPermission(perm);

      const subscribed = await isPushSubscribed();
      setIsSubscribed(subscribed);
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      await subscribeToPushNotifications();
      success('Browser notifications enabled successfully!');
      await checkNotificationStatus();
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      showError(err.message || 'Failed to enable browser notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      success('Browser notifications disabled');
      await checkNotificationStatus();
    } catch (err) {
      console.error('Failed to disable notifications:', err);
      showError('Failed to disable browser notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await showTestNotification();
      info('Test notification sent');
    } catch (err) {
      console.error('Failed to send test notification:', err);
      showError(err.message || 'Failed to send test notification');
    }
  };

  if (!isSupported) {
    return (
      <div className="push-notification-settings">
        <div className="notification-warning">
          <AlertCircle size={20} />
          <span>Browser push notifications are not supported in your browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className="push-notification-settings">
      <div className="settings-header">
        <h3>Browser Push Notifications</h3>
        <p className="settings-description">
          Receive instant alerts for missing persons and important events
        </p>
      </div>

      <div className="settings-content">
        <div className="notification-status">
          <div className="status-item">
            <span className="status-label">Permission:</span>
            <span className={`status-value status-${permission}`}>
              {permission === 'granted' && '✓ Granted'}
              {permission === 'denied' && '✗ Denied'}
              {permission === 'default' && '? Not requested'}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-value ${isSubscribed ? 'status-active' : 'status-inactive'}`}>
              {isSubscribed ? '✓ Active' : '✗ Inactive'}
            </span>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="notification-warning">
            <AlertCircle size={20} />
            <div>
              <p>Notifications are blocked in your browser.</p>
              <p className="help-text">
                To enable, click the lock icon in your address bar and allow notifications for this site.
              </p>
            </div>
          </div>
        )}

        <div className="settings-actions">
          {!isSubscribed && permission !== 'denied' && (
            <button
              onClick={handleEnableNotifications}
              disabled={loading}
              className="btn-primary btn-enable"
            >
              <Bell size={18} />
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </button>
          )}

          {isSubscribed && (
            <>
              <button
                onClick={handleDisableNotifications}
                disabled={loading}
                className="btn-secondary btn-disable"
              >
                <BellOff size={18} />
                {loading ? 'Disabling...' : 'Disable Notifications'}
              </button>

              <button
                onClick={handleTestNotification}
                className="btn-secondary btn-test"
              >
                <Check size={18} />
                Send Test Notification
              </button>
            </>
          )}
        </div>

        <div className="notification-info">
          <h4>How it works:</h4>
          <ul>
            <li>You'll receive browser notifications for missing person alerts</li>
            <li>Notifications work even when the tab is in the background</li>
            <li>Only staff with notification permissions will receive alerts</li>
            <li>Notifications are organization-specific</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationSettings;
