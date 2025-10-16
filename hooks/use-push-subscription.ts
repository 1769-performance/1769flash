/**
 * Hook for managing Web Push API subscriptions
 *
 * Features:
 * - Service worker registration
 * - Push subscription management
 * - VAPID key fetching
 * - Subscription lifecycle management
 */

import { deleteJson, getJson, postJson } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

/**
 * Proper base64 decoding that handles UTF-8 correctly
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert base64url string to Uint8Array
 * This handles URL-safe base64 encoding without padding
 */
function base64urlToUint8Array(base64url: string): Uint8Array {
  // Convert base64url to base64
  let base64 = base64url
    .replace(/-/g, "+") // Replace URL-safe characters
    .replace(/_/g, "/"); // Replace URL-safe characters

  // Add padding back if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  return base64ToUint8Array(base64);
}

interface PushSubscription {
  uuid: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string;
  is_active: boolean;
  created: string;
}

interface UsePushSubscriptionOptions {
  autoSubscribe?: boolean;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
}

export function usePushSubscription({
  autoSubscribe = false,
  onSubscriptionChange,
}: UsePushSubscriptionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        "getKey" in window.PushSubscription.prototype;

      setIsSupported(supported);
      console.log(
        "usePushSubscription - Push notifications supported:",
        supported
      );
    };

    checkSupport();
  }, []);

  // Get current notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if (!isSupported) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("✅ Service worker registered:", registration);

        // Log service worker state
        const sw =
          registration.installing ||
          registration.waiting ||
          registration.active;
        if (sw) {
          console.log(`📊 Service worker state: ${sw.state}`);

          // Listen for state changes
          sw.addEventListener("statechange", (e) => {
            console.log(
              `🔄 Service worker state changed to: ${
                (e.target as ServiceWorker).state
              }`
            );
          });
        }

        // Log registration details
        console.log("📦 SW Registration details:", {
          scope: registration.scope,
          active: registration.active?.state,
          waiting: registration.waiting?.state,
          installing: registration.installing?.state,
        });

        // Check if SW is ready to receive push
        if (registration.active) {
          console.log(
            "✅ Service worker is ACTIVE and ready to receive push notifications"
          );
        } else if (registration.waiting) {
          console.warn(
            '⚠️ Service worker is WAITING to activate. May need to close all tabs or click "skipWaiting" in DevTools'
          );
        } else if (registration.installing) {
          console.log("⏳ Service worker is INSTALLING...");
        }

        setSwRegistration(registration);
        return registration;
      } catch (err) {
        console.error("❌ Service worker registration failed:", err);
        setError("Failed to register service worker");
        return null;
      }
    };

    registerServiceWorker();
  }, [isSupported]);

  // Load existing subscription and sync state between browser and server
  useEffect(() => {
    if (!swRegistration) return;

    const loadSubscription = async () => {
      try {
        // Always check browser subscription state
        const pushSubscription =
          await swRegistration.pushManager.getSubscription();

        // Always check server subscription state
        const response = await getJson<any>("/push/subscriptions/");
        const subscriptions = response.results || response;

        console.log("🔄 Syncing subscription state:", {
          browserHasSubscription: !!pushSubscription,
          serverSubscriptions: Array.isArray(subscriptions)
            ? subscriptions.length
            : 0,
        });

        if (!Array.isArray(subscriptions)) {
          console.error("Unexpected API response format:", response);
          setSubscription(null);
          return;
        }

        // Find active subscriptions on server
        const activeSubscriptions = subscriptions.filter(
          (sub: any) => sub.is_active
        );

        if (pushSubscription) {
          // Browser has subscription - check if it matches server
          const matchingSubscription = activeSubscriptions.find(
            (sub: any) => sub.endpoint === pushSubscription.endpoint
          );

          if (matchingSubscription) {
            console.log("✅ Browser and server subscriptions match");
            setSubscription(matchingSubscription);
          } else {
            console.warn(
              "⚠️ Browser subscription not found on server, will re-sync on next subscribe"
            );
            setSubscription(null);
          }
        } else {
          // Browser has NO subscription
          if (activeSubscriptions.length > 0) {
            console.log(
              "🧹 Browser has no subscription but server has active subscriptions, cleaning up"
            );
            // Deactivate stale server subscriptions
            for (const sub of activeSubscriptions) {
              try {
                await fetch(
                  `${process.env.NEXT_PUBLIC_API_BASE_URL}/push/subscriptions/${sub.uuid}/`,
                  {
                    method: "DELETE",
                    credentials: "include",
                  }
                );
                console.log(`🗑️ Deactivated stale subscription: ${sub.uuid}`);
              } catch (err) {
                console.error("Failed to deactivate stale subscription:", err);
              }
            }
          }
          setSubscription(null);
        }
      } catch (err) {
        console.error("❌ Failed to load subscription:", err);
        setSubscription(null);
      }
    };

    loadSubscription();
  }, [swRegistration]);

  // Get VAPID public key
  const getVapidPublicKey = useCallback(async (): Promise<Uint8Array> => {
    try {
      // Add cache-busting parameter to ensure fresh response
      const timestamp = Date.now();
      const response = await getJson<{ public_key: string }>(
        `/push/subscriptions/vapid-public-key/?t=${timestamp}`
      );

      // The backend returns base64url-encoded VAPID key ready for Web Push API
      const base64urlKey = response.public_key;
      console.log("VAPID public key from backend:", base64urlKey);
      console.log("Key length:", base64urlKey.length);

      return handleBase64urlKey(base64urlKey);
    } catch (err) {
      console.error("Failed to get VAPID public key:", err);
      throw new Error("VAPID keys not configured");
    }
  }, []);

  // Handle base64url-encoded VAPID key (preferred format)
  const handleBase64urlKey = (base64urlKey: string): Uint8Array => {
    console.log("Processing base64url key:", base64urlKey);

    try {
      // Use proper base64url decoding that handles UTF-8 correctly
      const bytes = base64urlToUint8Array(base64urlKey);

      console.log("Decoded key length:", bytes.length);

      // Verify this is the correct format (should be 65 bytes for uncompressed P-256)
      if (bytes.length !== 65) {
        throw new Error(
          `Invalid VAPID public key length: ${bytes.length}, expected 65`
        );
      }

      // Verify first byte is 0x04 (uncompressed point format)
      if (bytes[0] !== 0x04) {
        throw new Error(
          `Invalid VAPID public key format: first byte is 0x${bytes[0].toString(
            16
          )}, expected 0x04`
        );
      }

      console.log("Successfully decoded base64url VAPID key");
      return bytes;
    } catch (err) {
      console.error("Failed to decode base64url key:", err);
      throw new Error(
        `Failed to decode base64url VAPID key: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !swRegistration) {
      throw new Error(
        "Push notifications not supported or service worker not ready"
      );
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        throw new Error("Notification permission denied");
      }

      // Get VAPID public key
      const applicationServerKey = await getVapidPublicKey();

      // Subscribe to push
      const pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log("✅ Push subscription created:", pushSubscription);
      console.log("📊 Push subscription details:", {
        endpoint: pushSubscription.endpoint,
        expirationTime: pushSubscription.expirationTime,
        keys: pushSubscription.toJSON().keys,
      });

      // Send subscription to server
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: pushSubscription.toJSON().keys?.p256dh || "",
          auth: pushSubscription.toJSON().keys?.auth || "",
        },
        user_agent: navigator.userAgent,
      };

      const response = await postJson<PushSubscription>(
        "/push/subscriptions/",
        subscriptionData
      );
      setSubscription(response);
      onSubscriptionChange?.(response);

      // Show success notification
      new Notification("Push notifications enabled!", {
        body: "You'll receive notifications even when the tab is closed.",
        icon: "/notification_icon.png",
        tag: "push-enabled",
      });

      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to subscribe";
      setError(errorMessage);
      console.error("Push subscription failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, swRegistration, getVapidPublicKey, onSubscriptionChange]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      console.warn("⚠️ Unsubscribe called but no subscription found");
      return;
    }

    console.log("🔄 Starting unsubscribe process...");
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Unsubscribe from browser first (more important)
      const pushSubscription =
        await swRegistration?.pushManager.getSubscription();
      if (pushSubscription) {
        console.log("🗑️ Unsubscribing from browser push manager...");
        const unsubscribed = await pushSubscription.unsubscribe();
        console.log(`✅ Browser unsubscribe result: ${unsubscribed}`);
      } else {
        console.warn("⚠️ No browser push subscription found");
      }

      // Step 2: Delete subscription from server (with CSRF token)
      console.log(`🗑️ Deleting subscription from server: ${subscription.uuid}`);
      await deleteJson(`/push/subscriptions/${subscription.uuid}/`);
      console.log("✅ Server subscription deleted");

      // Step 3: Clear local state
      setSubscription(null);
      onSubscriptionChange?.(null);

      console.log("✅ Push subscription removed successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(errorMessage);
      console.error("❌ Push unsubscribe failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscription, swRegistration, onSubscriptionChange]);

  // Auto-subscribe if enabled and permission is granted
  useEffect(() => {
    if (
      autoSubscribe &&
      isSupported &&
      permission === "granted" &&
      swRegistration &&
      !subscription
    ) {
      subscribe().catch(console.error);
    }
  }, [
    autoSubscribe,
    isSupported,
    permission,
    swRegistration,
    subscription,
    subscribe,
  ]);

  return {
    isSupported,
    permission,
    isLoading,
    error,
    subscription,
    subscribe,
    unsubscribe,
    canSubscribe: isSupported && permission === "default",
    isSubscribed: !!subscription,
  };
}
