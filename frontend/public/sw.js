/**
 * Service Worker for Web Push Notifications
 * Handles push events and notification clicks
 */

// Handle push notification received
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);

    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/logo.png',
      badge: data.badge || '/badge.png',
      data: data.data || {},
      requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
      tag: data.tag || 'default-notification',
      vibrate: [200, 100, 200],
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'RTLS Notification', options)
    );
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Get the URL to open from notification data
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If not, open a new window/tab with the URL
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle service worker activation
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim());
});

// Handle service worker installation
self.addEventListener('install', event => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});

// Handle push subscription change (endpoint expired or updated)
self.addEventListener('pushsubscriptionchange', event => {
  console.log('[Service Worker] Push subscription changed');

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    })
    .then(subscription => {
      console.log('[Service Worker] New subscription:', subscription);
      // TODO: Send new subscription to server
      // This would require storing the API endpoint in IndexedDB
      // and making a fetch request here
    })
    .catch(error => {
      console.error('[Service Worker] Subscription renewal failed:', error);
    })
  );
});
