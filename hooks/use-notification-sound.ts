/**
 * Hook for managing notification sounds with automatic user gesture handling
 *
 * Browsers require a user gesture before playing audio (autoplay policy).
 * This hook automatically enables sound on first user interaction.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Initialize audio element and auto-enable on user interaction
  useEffect(() => {
    if (typeof window === "undefined") return;

    audioRef.current = new Audio("/notification_sound.mp3");
    audioRef.current.preload = "auto";

    let isEnabled = false;

    // Auto-enable sound on first user interaction
    const enableSoundOnInteraction = async () => {
      if (isEnabled || !audioRef.current) return;

      try {
        // Prime audio by playing and immediately pausing (required by browser autoplay policy)
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        isEnabled = true;
        setSoundEnabled(true);

        // Remove listeners after success
        window.removeEventListener("click", enableSoundOnInteraction);
        window.removeEventListener("keydown", enableSoundOnInteraction);
        window.removeEventListener("touchstart", enableSoundOnInteraction);
      } catch (err) {
        // Silently fail - will retry on next interaction
      }
    };

    // Listen for any user interaction
    window.addEventListener("click", enableSoundOnInteraction);
    window.addEventListener("keydown", enableSoundOnInteraction);
    window.addEventListener("touchstart", enableSoundOnInteraction);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.removeEventListener("click", enableSoundOnInteraction);
      window.removeEventListener("keydown", enableSoundOnInteraction);
      window.removeEventListener("touchstart", enableSoundOnInteraction);
    };
  }, []);

  // Play sound
  const playSound = useCallback(async () => {
    if (!audioRef.current || !soundEnabled) return;

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (err) {
      // Silently fail - audio playback can fail for many reasons
      // and it shouldn't block notifications
    }
  }, [soundEnabled]);

  // Listen for service worker messages
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PLAY_NOTIFICATION_SOUND") {
        playSound();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [playSound]);

  return {
    soundEnabled,
    playSound,
  };
}
