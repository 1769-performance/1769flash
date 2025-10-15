/**
 * Service Worker for 1769 Dashboard
 *
 * Features:
 * - Web Push API support for background notifications
 * - Push event handling with notification display
 * - Notification click handling for navigation
 * - Subscription management
 */

const CACHE_NAME = "1769-dashboard-v1";
const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001/v1')
  : '';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/logo.png',
        '/badge.png',
        '/notification.mp3',
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - handle incoming push messages
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');

  let notificationData = {
    title: '1769 Dashboard',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/badge.png',
    tag: '1769-notification',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Service Worker: Push data received:', data);

      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        tag: data.tag || notificationData.tag,
        data: data.data || {},
        // Add timestamp to prevent duplicate notifications
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Service Worker: Error parsing push data:', error);
      // If JSON parsing fails, use the raw text as body
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');

  event.notification.close();

  // Handle navigation based on notification data
  const urlToOpen = event.notification.data?.url || '/projects';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if a client is already open
        for (const client of clientList) {
          if (client.url === new URL(urlToOpen, self.location.origin).href && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window if no client found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event - optional cleanup
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
  // Could add analytics or cleanup logic here
});

// Push subscription change event - handle subscription updates
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Service Worker: Push subscription changed');

  event.waitUntil(
    self.registration.pushManager.getSubscription()
      .then((subscription) => {
        if (subscription) {
          // Send new subscription to server
          return fetch(`${API_BASE_URL}/push/subscriptions/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              keys: subscription.toJSON().keys,
              user_agent: navigator.userAgent,
            }),
          });
        }
      })
      .catch((error) => {
        console.error('Service Worker: Error updating subscription:', error);
      })
  );
});

// Helper function to get auth token (you may need to adapt this)
function getAuthToken() {
  // This is a placeholder - you'll need to implement proper token storage
  // Could be stored in IndexedDB, localStorage, or cookies
  return localStorage.getItem('auth_token') || '';
}

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});