/**
 * Hook for managing Web Push API subscriptions
 *
 * Features:
 * - Service worker registration
 * - Push subscription management
 * - VAPID key fetching
 * - Subscription lifecycle management
 */

import { getJson, postJson } from "@/lib/api";
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
    .replace(/-/g, '+')  // Replace URL-safe characters
    .replace(/_/g, '/');   // Replace URL-safe characters

  // Add padding back if needed
  while (base64.length % 4) {
    base64 += '=';
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
        console.log("Service worker registered:", registration);
        setSwRegistration(registration);
        return registration;
      } catch (err) {
        console.error("Service worker registration failed:", err);
        setError("Failed to register service worker");
        return null;
      }
    };

    registerServiceWorker();
  }, [isSupported]);

  // Load existing subscription
  useEffect(() => {
    if (!swRegistration) return;

    const loadSubscription = async () => {
      try {
        const pushSubscription =
          await swRegistration.pushManager.getSubscription();
        if (pushSubscription) {
          // Fetch subscription details from server
          const response = await getJson<any>("/push/subscriptions/");

          // Handle paginated response structure
          const subscriptions = response.results || response;

          if (Array.isArray(subscriptions)) {
            const currentSubscription = subscriptions.find(
              (sub) => sub.endpoint === pushSubscription.endpoint
            );
            setSubscription(currentSubscription || null);
          } else {
            console.error("Unexpected API response format:", response);
            setSubscription(null);
          }
        }
      } catch (err) {
        console.error("Failed to load subscription:", err);
        setSubscription(null);
      }
    };

    loadSubscription();
  }, [swRegistration]);

  // Get VAPID public key
  const getVapidPublicKey = useCallback(async (): Promise<Uint8Array> => {
    try {
      // Add multiple cache-busting parameters to ensure fresh response
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const response = await getJson<{ public_key: string }>(
        `/push/subscriptions/vapid-public-key/?t=${timestamp}&r=${random}&cb=${timestamp}`
      );

      // The backend should return base64url-encoded VAPID key
      const rawKey = response.public_key;
      console.log("Raw VAPID public key:", rawKey);
      console.log("Key length:", rawKey.length);

      // Detect format and handle appropriately
      // Base64url (Web Push standard): shorter, no padding, contains - or _, usually 88 chars
      // DER-encoded (fallback): longer, has padding ==, contains only +/ chars, usually 126+ chars
      if (rawKey.length < 100 && !rawKey.includes('==') && (rawKey.includes('-') || rawKey.includes('_'))) {
        console.log("Detected base64url format (Web Push standard)");
        return handleBase64urlKey(rawKey);
      } else if (rawKey.length > 100 && (rawKey.includes('==') || /^[A-Za-z0-9+/=]+$/.test(rawKey))) {
        console.log("Detected DER-encoded format, extracting base64url key");
        return handleDerEncodedKey(rawKey);
      } else {
        console.log("Unknown format, trying base64url first");
        try {
          return handleBase64urlKey(rawKey);
        } catch (b64urlError) {
          console.log("Base64url failed, trying DER format");
          return handleDerEncodedKey(rawKey);
        }
      }
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
        throw new Error(`Invalid VAPID public key length: ${bytes.length}, expected 65`);
      }

      // Verify first byte is 0x04 (uncompressed point format)
      if (bytes[0] !== 0x04) {
        throw new Error(`Invalid VAPID public key format: first byte is 0x${bytes[0].toString(16)}, expected 0x04`);
      }

      console.log("Successfully decoded base64url VAPID key");
      return bytes;
    } catch (err) {
      console.error("Failed to decode base64url key:", err);
      throw new Error(`Failed to decode base64url VAPID key: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle DER-encoded X.256 public key (fallback format)
  const handleDerEncodedKey = (derKey: string): Uint8Array => {
    console.log("Processing DER-encoded key:", derKey);

    try {
      // Clean the base64 string
      const cleanBase64Key = derKey.replace(/[^A-Za-z0-9+/=]/g, '');

      // Add padding if needed
      const paddingNeeded = (4 - (cleanBase64Key.length % 4)) % 4;
      const paddedBase64Key = cleanBase64Key + '='.repeat(paddingNeeded);

      console.log("Cleaned and padded base64:", paddedBase64Key);

      // Use proper base64 decoding
      const derKeyBytes = base64ToUint8Array(paddedBase64Key);

      console.log("DER key length:", derKeyBytes.length);

      // Extract the raw 65-byte public key (last 65 bytes)
      if (derKeyBytes.length < 65) {
        throw new Error(`DER key too short: ${derKeyBytes.length} bytes, expected at least 65`);
      }

      const rawPublicKey = derKeyBytes.slice(-65);
      console.log("Extracted raw key length:", rawPublicKey.length);

      // Verify this is the correct format (uncompressed point)
      if (rawPublicKey.length !== 65 || rawPublicKey[0] !== 0x04) {
        throw new Error(`Invalid VAPID public key format: length=${rawPublicKey.length}, first_byte=${rawPublicKey[0]?.toString(16)}`);
      }

      console.log("Successfully extracted VAPID key from DER format");
      return rawPublicKey;
    } catch (err) {
      console.error("Failed to decode DER key:", err);
      throw new Error(`Failed to decode DER VAPID key: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

      console.log("Push subscription created:", pushSubscription);

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
        icon: "/logo.png",
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
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Delete subscription from server using our API client
      await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/push/subscriptions/${subscription.uuid}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Unsubscribe from push
      const pushSubscription =
        await swRegistration?.pushManager.getSubscription();
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }

      setSubscription(null);
      onSubscriptionChange?.(null);

      console.log("Push subscription removed");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(errorMessage);
      console.error("Push unsubscribe failed:", err);
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
