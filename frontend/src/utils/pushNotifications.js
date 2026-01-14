/**
 * Push Notification Utilities
 * Handles Web Push notification subscription and management
 */

import api from '../services/api';

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission() {
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  return permission;
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey() {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/push-subscriptions/vapid-public-key`);

    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }

    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications() {
  try {
    // Check support
    if (!isPushNotificationSupported()) {
      throw new Error('Push notifications are not supported');
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Register service worker
    const registration = await registerServiceWorker();

    // Get VAPID public key from server
    const vapidPublicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    console.log('Push subscription:', subscription);

    // Send subscription to server
    await sendSubscriptionToServer(subscription);

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove subscription from server
      await removeSubscriptionFromServer(subscription);

      // Unsubscribe from push manager
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
}

/**
 * Check if user is currently subscribed
 */
export async function isPushSubscribed() {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Send subscription to server
 */
async function sendSubscriptionToServer(subscription) {
  try {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth'))
      },
      user_agent: navigator.userAgent
    };

    await api.post('/push-subscriptions', subscriptionData);
    console.log('Subscription sent to server');
  } catch (error) {
    console.error('Error sending subscription to server:', error);
    throw error;
  }
}

/**
 * Remove subscription from server
 */
async function removeSubscriptionFromServer(subscription) {
  try {
    await api.delete('/push-subscriptions', {
      data: {
        endpoint: subscription.endpoint
      }
    });
    console.log('Subscription removed from server');
  } catch (error) {
    console.error('Error removing subscription from server:', error);
    throw error;
  }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Show a test notification (useful for testing)
 */
export async function showTestNotification() {
  if (!isPushNotificationSupported()) {
    throw new Error('Notifications are not supported');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification('Test Notification', {
    body: 'This is a test notification from RTLS',
    icon: '/logo.png',
    badge: '/badge.png',
    requireInteraction: false,
    tag: 'test-notification'
  });
}
