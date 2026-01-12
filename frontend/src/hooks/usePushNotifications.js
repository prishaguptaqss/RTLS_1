/**
 * Custom hook for managing push notifications
 */
import { useState, useEffect } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  isPushSubscribed,
  subscribeToPushNotifications
} from '../utils/pushNotifications';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = getNotificationPermission();
      setPermission(perm);

      const subscribed = await isPushSubscribed();
      setIsSubscribed(subscribed);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      await subscribeToPushNotifications();
      await checkStatus();
      return true;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    checkStatus
  };
}
