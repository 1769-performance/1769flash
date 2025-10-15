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
      const response = await getJson<{ public_key: string }>(
        "/push/subscriptions/vapid-public-key/"
      );

      // The VAPID public key from backend is in DER-encoded X.509 format
      // We need to extract the raw 65-byte P-256 public key
      const base64Key = response.public_key;

      // Decode the DER-encoded key
      const derKeyBytes = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));

      // Extract the raw 65-byte public key (last 65 bytes of DER structure)
      // DER format for P-256 public key: header + 0x04 + 32 bytes X + 32 bytes Y
      const rawPublicKey = derKeyBytes.slice(-65); // Last 65 bytes

      // Verify this is the correct format (uncompressed point)
      if (rawPublicKey.length !== 65 || rawPublicKey[0] !== 0x04) {
        throw new Error("Invalid VAPID public key format");
      }

      return rawPublicKey;
    } catch (err) {
      console.error("Failed to get VAPID public key:", err);
      throw new Error("VAPID keys not configured");
    }
  }, []);

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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/push/subscriptions/${subscription.uuid}/`,
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
