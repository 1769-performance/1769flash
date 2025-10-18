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
const API_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/v1"
    : "";

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        "/",
        "/notification_icon.png",
        "/notification_sound.mp3",
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - handle incoming push messages
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "1769 Dashboard",
    body: "You have a new notification",
    icon: "/notification_icon.png",
    // Generate unique tag to prevent notification collapsing
    tag: `1769-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile devices
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();

      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        // Create unique tag based on content to prevent duplicates but allow similar notifications
        tag:
          data.tag ||
          `1769-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: data.data || {},
        // Enhanced notification settings
        requireInteraction: data.requireInteraction !== false,
        silent: false,
        // Add vibration for better visibility (works on mobile)
        vibrate: [200, 100, 200],
      };
    } catch (error) {
      console.error("[SW Push] ❌ Error parsing push data:", error);
      // If JSON parsing fails, use the raw text as body
      try {
        notificationData.body = event.data.text();
      } catch (textError) {
        console.error(
          "[SW Push] ❌ Error getting text from event.data:",
          textError
        );
      }
    }
  } else {
    console.warn(
      "[SW Push] ⚠️ No event.data received, using default notification"
    );
  }

  event.waitUntil(
    (async () => {
      try {
        // Step 1: Send messages to all open client pages
        // (Service workers cannot play audio directly)
        const clientPages = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        for (const page of clientPages) {
          // Send sound notification for all push notifications
          page.postMessage({
            type: "PLAY_NOTIFICATION_SOUND",
            url: "/notification_sound.mp3",
          });

          // Auto-refresh for file/log upload notifications
          if (notificationData.data?.file_uuid || notificationData.data?.log_uuid) {
            page.postMessage({
              type: "RELOAD_PAGE",
              reason: "file_uploaded",
              data: notificationData.data,
            });
          }

          // Auto-refresh for new project notifications
          if (notificationData.data?.project_uuid && notificationData.data?.url === "/projects") {
            page.postMessage({
              type: "RELOAD_PAGE",
              reason: "project_created",
              data: notificationData.data,
            });
          }
        }

        // Step 2: Show the notification
        await self.registration.showNotification(
          notificationData.title,
          notificationData
        );
      } catch (error) {
        console.error("[SW Push] ❌ Failed to display notification:", error);
        console.error(
          "[SW Push] Notification data that failed:",
          JSON.stringify(notificationData, null, 2)
        );
      }
    })()
  );
});

// Notification click event - handle user interaction
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/projects";
  const hasFileUpload = event.notification.data?.file_uuid || event.notification.data?.log_uuid;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if a client is already open at the target URL
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);

          // Match by pathname (ignore query params and hash)
          if (clientUrl.pathname === targetUrl.pathname && "focus" in client) {
            // Send reload message for project pages with file uploads
            if (hasFileUpload && targetUrl.pathname.startsWith('/projects/')) {
              client.postMessage({
                type: "RELOAD_PAGE",
                reason: "file_uploaded"
              });
            }

            return client.focus();
          }
        }

        // Open new window if no matching client found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event - optional cleanup
self.addEventListener("notificationclose", (event) => {
  // Could add analytics or cleanup logic here
});

// Push subscription change event - handle subscription updates
self.addEventListener("pushsubscriptionchange", (event) => {

  event.waitUntil(
    self.registration.pushManager
      .getSubscription()
      .then((subscription) => {
        if (subscription) {
          // Send new subscription to server
          // Note: Using credentials: "include" for cookie-based auth
          // Authorization header removed because localStorage is not available in service workers
          return fetch(`${API_BASE_URL}/push/subscriptions/`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
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
        console.error("Service Worker: Error updating subscription:", error);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === "document") {
          return caches.match("/");
        }
      })
  );
});
