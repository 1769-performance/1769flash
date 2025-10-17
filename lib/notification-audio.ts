/**
 * Notification Audio Utility
 *
 * Handles notification sound playback across the application.
 * Includes silent initialization to bypass browser autoplay restrictions.
 */

// Cache audio element to reuse it
let notificationAudio: HTMLAudioElement | null = null;
let audioInitialized = false;

/**
 * Initialize audio element on first user interaction to bypass browser autoplay restrictions.
 * This function plays the audio silently (volume = 0) to "prime" it for future playback.
 * Call this function when user interacts with the page (click, keypress, etc.)
 */
export function initializeNotificationAudio() {
  if (audioInitialized) return;

  try {
    notificationAudio = new Audio("/notification_sound.mp3");
    notificationAudio.volume = 0; // Set volume to 0 for silent initialization
    notificationAudio.preload = "auto";

    // Play and immediately pause to "prime" the audio for autoplay (silently!)
    notificationAudio
      .play()
      .then(() => {
        if (notificationAudio) {
          notificationAudio.pause();
          notificationAudio.currentTime = 0;
          notificationAudio.volume = 0.5; // Restore normal volume for actual notifications
          audioInitialized = true;
        }
      })
      .catch(() => {
        // Silent failure - audio will use fallback when needed
      });
  } catch {
    // Silent failure - audio will use fallback when needed
  }
}

/**
 * Play notification sound
 * Uses the notification_sound.mp3 file from public folder
 */
export function playNotificationSound() {
  // Initialize audio if not already done
  if (!audioInitialized) {
    initializeNotificationAudio();
  }

  try {
    // Use existing audio element if available
    if (notificationAudio && audioInitialized) {
      // Reset audio to start if it was previously played
      notificationAudio.currentTime = 0;

      // Try to play the sound
      const playPromise = notificationAudio.play();

      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fall back to system notification sound if custom sound fails
          playSystemNotificationSound();
        });
      }
    } else {
      // Fallback: create new audio element
      const audio = new Audio("/notification_sound.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        playSystemNotificationSound();
      });
    }
  } catch {
    // Fall back to system notification sound
    playSystemNotificationSound();
  }
}

/**
 * Fallback: Play system notification sound using Web Audio API
 * This is a simple fallback that should work in most browsers
 */
function playSystemNotificationSound() {
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Hz
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Silent failure - notification sound is optional
  }
}
