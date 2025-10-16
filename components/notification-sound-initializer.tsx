/**
 * Invisible component that initializes notification sounds
 *
 * Should be placed in root layout to enable sounds app-wide.
 * Automatically enables sound on first user interaction.
 */

"use client";

import { useNotificationSound } from "@/hooks/use-notification-sound";

export function NotificationSoundInitializer() {
  // Initialize the hook - it handles everything automatically
  useNotificationSound();

  // No UI - this is a silent initializer
  return null;
}
