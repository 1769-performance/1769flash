/**
 * Component to request browser notification permissions with Web Push integration
 *
 * Shows a banner prompting user to enable notifications for real-time messages.
 * Integrates with Web Push API for background notifications.
 */

"use client";

import { useState, useEffect } from "react";
import { Bell, X, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { usePushSubscription } from "@/hooks/use-push-subscription";

export function NotificationPermission() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const {
    isSupported,
    permission,
    isLoading,
    error,
    subscription,
    subscribe,
    unsubscribe,
    canSubscribe,
    isSubscribed,
  } = usePushSubscription({
    onSubscriptionChange: (sub) => {
      console.log('Push subscription changed:', sub);
      // Hide banner when successfully subscribed
      if (sub) {
        setShowBanner(false);
      }
    },
  });

  // Debug log the initial state
  console.log('NotificationPermission initial state:', {
    isSupported,
    permission,
    isLoading,
    error,
    subscription,
    canSubscribe,
    isSubscribed,
    showBanner
  });

  useEffect(() => {
    // Debug logging
    console.log('NotificationPermission Debug:', {
      isSupported,
      permission,
      isSubscribed,
      canSubscribe,
      dismissed
    });

    // Show banner if notifications are supported, not subscribed, not dismissed, and permission is not denied
    const isDismissed = localStorage.getItem("notification-banner-dismissed") === "true";
    setDismissed(isDismissed);

    // Show banner if: supported, not subscribed, not dismissed, and permission is granted or default
    const canShowBanner = isSupported && !isSubscribed && !isDismissed && permission !== "denied";

    if (canShowBanner) {
      console.log('Showing banner - all conditions met');
      setShowBanner(true);
    } else {
      console.log('Not showing banner:', {
        isSupported,
        isSubscribed,
        isDismissed,
        permission
      });
      // Don't hide banner if it was manually shown (e.g., after unsubscribe)
      if (!canShowBanner && isDismissed) {
        setShowBanner(false);
      }
    }
  }, [isSupported, isSubscribed, permission, dismissed]);

  const handleSubscribe = async () => {
    try {
      await subscribe();
      setShowBanner(false);
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
      // After unsubscribe, reset dismissal state and show enable banner
      localStorage.removeItem("notification-banner-dismissed");
      setDismissed(false);
      setShowBanner(true);

      // Note: We cannot programmatically revoke browser notification permission
      // This is a security feature - users must manually reset permissions via browser settings
      console.log("ℹ️ Push subscription removed. To fully reset browser permissions, use browser settings (lock icon in address bar).");
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  // Show always visible notification options for subscribed users
  if (isSubscribed) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Push notifications enabled
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              You&apos;ll receive notifications even when the tab is closed
            </p>
            {subscription && (
              <p className="text-xs text-green-600 mt-1 dark:text-green-400">
                Active since {new Date(subscription.created).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-300 dark:border-green-600">
              Active
            </Badge>
            <Button size="sm" variant="outline" onClick={handleUnsubscribe} disabled={isLoading} className="dark:border-green-600 dark:hover:bg-green-900 dark:text-green-100">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4 mr-1" />}
              Disable
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  
  // Show permission denied message with option to reset
  if (permission === "denied") {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              Notifications blocked
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Enable notifications in your browser settings to receive real-time updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-700 border-yellow-300 dark:text-yellow-300 dark:border-yellow-600">
              Blocked
            </Badge>
            <Button size="sm" variant="outline" onClick={() => {
              localStorage.removeItem("notification-banner-dismissed");
              setDismissed(false);
              setShowBanner(true);
            }} className="dark:border-yellow-600 dark:hover:bg-yellow-900 dark:text-yellow-100">
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show subscription banner when:
  // - showBanner is true (user hasn't dismissed or just unsubscribed)
  // - Not currently subscribed
  // - Permission is granted or default (not denied)
  if (showBanner && !isSubscribed && permission !== "denied") {
    return (
      <div className="space-y-3">
        <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="space-y-4 sm:space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Enable push notifications</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Get real-time alerts for messages, file uploads, and project updates - even when the tab is closed
              </p>
            </div>
            <div className="flex flex-row gap-2 lg:flex-col lg:w-auto">
              <Button size="sm" variant="outline" onClick={handleDismiss} className="flex-1 lg:w-full dark:border-blue-600 dark:hover:bg-blue-900 dark:text-blue-100">
                <X className="h-4 w-4 mr-2 shrink-0" />
                <span>Dismiss</span>
              </Button>
              <Button size="sm" onClick={handleSubscribe} disabled={isLoading} className="flex-1 lg:w-full dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                ) : (
                  <Bell className="h-4 w-4 mr-2 shrink-0" />
                )}
                <span>Enable</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription>
              <p className="text-sm text-red-900 dark:text-red-100">Failed to enable notifications</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Don't show anything if:
  // - Not supported
  // - Already subscribed (green banner shown above)
  // - Permission denied (yellow banner shown above)
  // - Banner dismissed and no subscription (user chose to dismiss)
  return null;
}
