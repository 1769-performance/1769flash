/**
 * WebSocket hook for real-time project messaging
 *
 * Features:
 * - Real-time message sending/receiving
 * - Automatic reconnection on disconnect
 * - Browser notifications with sound
 * - Connection state management
 */

import { getJson } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Message {
  uuid: string;
  text: string;
  created: string;
  sender_username: string;
}

interface WebSocketMessage {
  type: string;
  message?: Message;
  messages?: Message[]; // For message.history event
  project_uuid?: string;
  error?: string;
}

interface UseProjectMessagesOptions {
  projectId: string;
  currentUsername?: string; // Current user's username to filter out own messages from notifications
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number; // milliseconds
}

interface UseProjectMessagesReturn {
  messages: Message[];
  sendMessage: (text: string) => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  reconnect: () => void;
  connectionMode: "websocket" | "polling";
}

export function useProjectMessages({
  projectId,
  currentUsername,
  onMessage,
  onError,
  autoReconnect = true,
  reconnectDelay = 3000,
}: UseProjectMessagesOptions): UseProjectMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionMode, setConnectionMode] = useState<"websocket" | "polling">(
    "websocket"
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 10; // Maximum reconnection attempts
  const lastMessageIdRef = useRef<string | null>(null); // Track last seen message for polling
  const historyReceivedRef = useRef(false); // Track if we've received history from WebSocket

  // Store callbacks in refs to avoid recreating connect function
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    setIsConnecting(true);
    setError(null);

    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // In production, use the same host as the current page for WebSocket connection
    // In development, use configurable WebSocket host
    let wsHost: string;

    if (process.env.NEXT_PUBLIC_WS_URL) {
      // Custom WebSocket host configured (useful for development)
      wsHost = process.env.NEXT_PUBLIC_WS_URL;
    } else if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      // Development environment
      wsHost = "127.0.0.1:8001"; // Match development backend port
    } else {
      // Production environment - use same host as current page
      wsHost = window.location.host;
    }

    const wsUrl = `${protocol}//${wsHost}/ws/projects/${projectId}/messages/`;

    console.log("Connecting to WebSocket:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on successful connection
      };

      ws.onmessage = (event) => {
        const timestamp = new Date().toISOString();
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log(`[WebSocket] ${timestamp} Event received:`, {
            type: data.type,
            dataKeys: Object.keys(data),
          });

          switch (data.type) {
            case "connection.established":
              console.log(
                `[WebSocket] ${timestamp} ✅ Connection established for project:`,
                data.project_uuid
              );
              break;

            case "message.history":
              // Load historical messages when first connecting
              console.log(
                `[WebSocket] ${timestamp} 📚 message.history event:`,
                {
                  hasMessages: !!data.messages,
                  isArray: Array.isArray(data.messages),
                  messageCount: data.messages?.length || 0,
                  messages: data.messages,
                }
              );

              if (data.messages && Array.isArray(data.messages)) {
                console.log(
                  `[WebSocket] ${timestamp} ✅ Loading ${data.messages.length} historical messages`
                );
                setMessages(data.messages);
                historyReceivedRef.current = true;

                // Log first message for verification
                if (data.messages.length > 0) {
                  console.log(
                    `[WebSocket] ${timestamp} First message:`,
                    data.messages[0]
                  );
                  lastMessageIdRef.current =
                    data.messages[data.messages.length - 1].uuid;
                }
              } else {
                console.warn(
                  `[WebSocket] ${timestamp} ⚠️ message.history has no valid messages array`
                );
              }
              break;

            case "message.new":
              if (data.message) {
                console.log(
                  `[WebSocket] ${timestamp} 📨 New message received:`,
                  {
                    uuid: data.message.uuid,
                    text: data.message.text.substring(0, 50),
                    sender: data.message.sender_username,
                    created: data.message.created,
                  }
                );
                setMessages((prev) => {
                  console.log(
                    `[WebSocket] ${timestamp} Current message count: ${prev.length}, adding 1`
                  );
                  return [...prev, data.message!];
                });

                // Call callback if provided
                if (onMessageRef.current) {
                  onMessageRef.current(data.message);
                }

                // DISABLED: Using Web Push notifications instead (sent by backend)
                // Show browser notification only if message is NOT from current user
                // if (data.message.sender_username !== currentUsername) {
                //   showNotification(data.message);
                // }
              } else {
                console.warn(
                  `[WebSocket] ${timestamp} ⚠️ message.new has no message data`
                );
              }
              break;

            case "error":
              console.error(`[WebSocket] ${timestamp} ❌ Error:`, data.error);
              setError(new Error(data.error || "Unknown WebSocket error"));
              break;

            default:
              console.warn(
                `[WebSocket] ${timestamp} ⚠️ Unknown message type:`,
                data.type
              );
          }
        } catch (err) {
          console.error(
            `[WebSocket] ${timestamp} ❌ Failed to parse message:`,
            err,
            "Raw data:",
            event.data
          );
        }
      };

      ws.onerror = (event) => {
        // Only log and set errors after first connection attempt to avoid noise from expected retries
        if (retryCountRef.current > 0) {
          console.error("WebSocket error event:", event);
          const err = new Error("WebSocket connection error");
          setError(err);

          if (onErrorRef.current) {
            onErrorRef.current(err);
          }
        }
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Auto-reconnect if enabled and under retry limit
        if (
          shouldReconnectRef.current &&
          autoReconnect &&
          retryCountRef.current < maxRetries
        ) {
          retryCountRef.current += 1;
          const delay = Math.min(reconnectDelay * retryCountRef.current, 30000); // Exponential backoff, max 30s
          console.log(
            `Reconnecting in ${delay}ms... (attempt ${retryCountRef.current}/${maxRetries})`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (retryCountRef.current >= maxRetries) {
          console.error(
            `Max WebSocket reconnection attempts (${maxRetries}) reached. Falling back to HTTP polling.`
          );
          // Fall back to HTTP polling
          startPolling();
          setError(
            new Error("WebSocket unavailable. Using HTTP polling for messages.")
          );
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError(err as Error);
      setIsConnecting(false);

      if (onErrorRef.current) {
        onErrorRef.current(err as Error);
      }
    }
  }, [projectId, autoReconnect, reconnectDelay]); // Removed onMessage and onError from dependencies

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionMode("websocket");
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setConnectionMode("polling");
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    console.log("Started HTTP polling for messages");

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const url = lastMessageIdRef.current
          ? `/projects/${projectId}/messages/?after=${lastMessageIdRef.current}`
          : `/projects/${projectId}/messages/`;

        const response = await getJson<
          { results?: Message[]; count?: number } | Message[]
        >(url);
        const newMessages = Array.isArray(response)
          ? response
          : response.results || [];

        if (newMessages.length > 0) {
          console.log(`Polling: found ${newMessages.length} new messages`);

          // Update last message ID
          lastMessageIdRef.current = newMessages[newMessages.length - 1].uuid;

          // Add new messages
          setMessages((prev) => [...prev, ...newMessages]);

          // Notify about new messages
          newMessages.forEach((message) => {
            if (onMessageRef.current) {
              onMessageRef.current(message);
            }

            // DISABLED: Using Web Push notifications instead (sent by backend)
            // Show notifications for messages not from current user
            // if (message.sender_username !== currentUsername) {
            //   showNotification(message);
            // }
          });
        }
      } catch (err) {
        console.error("Polling error:", err);
        // Don't set error state for polling errors, just log them
      }
    }, 3000);
  }, [projectId, currentUsername]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
    setConnectionMode("websocket");
    console.log("Stopped HTTP polling");
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    retryCountRef.current = 0; // Reset retry count for manual reconnect
    setConnectionMode("websocket"); // Try WebSocket first
    connect();
  }, [connect, disconnect]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        console.error("Cannot send empty message");
        return;
      }

      // If WebSocket is available and connected, use it
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ text }));
          return;
        } catch (err) {
          console.error("Failed to send WebSocket message:", err);
          // Fall back to HTTP
        }
      }

      // Fall back to HTTP POST for sending messages (polling mode)
      try {
        console.log("Sending message via HTTP POST");
        const response = await fetch(`/v1/projects/${projectId}/messages/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Include credentials for authentication
          },
          credentials: "include",
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const message = await response.json();
        console.log("Message sent successfully via HTTP");

        // Add the message immediately to local state
        setMessages((prev) => [...prev, message]);

        // Update last message ID for polling
        lastMessageIdRef.current = message.uuid;
      } catch (err) {
        console.error("Failed to send message via HTTP:", err);
        setError(err as Error);
      }
    },
    [projectId]
  );

  // Load existing messages via REST API (only as fallback if WebSocket hasn't loaded them)
  useEffect(() => {
    const loadMessages = async () => {
      const startTime = Date.now();
      console.log(
        `[REST Fallback] Starting 1.5s wait to see if WebSocket sends history...`
      );

      // Wait a bit to see if WebSocket sends history first
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const elapsed = Date.now() - startTime;
      console.log(
        `[REST Fallback] ${elapsed}ms elapsed. Checking if history was received...`,
        {
          historyReceived: historyReceivedRef.current,
          currentMessageCount: messages.length,
        }
      );

      // Only load from REST if we haven't received history from WebSocket
      if (!historyReceivedRef.current) {
        try {
          console.log(
            `[REST Fallback] ⚠️ WebSocket didn't send history, loading ALL messages via REST API (with pagination)`
          );

          // Load all pages of messages
          let allMessages: Message[] = [];
          let nextUrl:
            | string
            | null = `/projects/${projectId}/messages/?limit=100`; // Use larger page size
          let pageCount = 0;

          while (nextUrl) {
            pageCount++;
            console.log(
              `[REST Fallback] Fetching page ${pageCount}: ${nextUrl}`
            );

            const response = await getJson<{
              results: Message[];
              next: string | null;
              count: number;
            }>(nextUrl);

            const pageMessages = response.results || [];
            allMessages = [...allMessages, ...pageMessages];

            console.log(
              `[REST Fallback] Page ${pageCount}: got ${pageMessages.length} messages, total so far: ${allMessages.length}`
            );

            // Get next page URL (remove base URL if present, keep only the path)
            if (response.next) {
              try {
                const nextUrlObj = new URL(response.next);
                nextUrl = nextUrlObj.pathname + nextUrlObj.search;
              } catch {
                // If it's already a relative URL, use it as-is
                nextUrl = response.next;
              }
            } else {
              nextUrl = null;
            }
          }

          console.log(
            `[REST Fallback] ✅ Loaded ALL messages: ${allMessages.length} messages across ${pageCount} pages`
          );
          if (allMessages.length > 0) {
            console.log(`[REST Fallback] First message:`, allMessages[0]);
            console.log(
              `[REST Fallback] Last message:`,
              allMessages[allMessages.length - 1]
            );
          }

          setMessages(allMessages);

          // Set the last message ID for polling
          if (allMessages.length > 0) {
            lastMessageIdRef.current = allMessages[allMessages.length - 1].uuid;
          }
        } catch (err) {
          console.error(`[REST Fallback] ❌ Failed to load messages:`, err);
        }
      } else {
        console.log(
          `[REST Fallback] ✅ Messages already loaded via WebSocket (${messages.length} messages), skipping REST API call`
        );
      }
    };

    loadMessages();
  }, [projectId]);

  // Connect on mount
  useEffect(() => {
    console.log(
      `[WebSocket] Initializing WebSocket connection for project ${projectId}`
    );

    // Reset history flag when projectId changes
    historyReceivedRef.current = false;
    console.log(`[WebSocket] Reset historyReceivedRef to false`);

    // Set flag to allow reconnection
    shouldReconnectRef.current = true;

    // Only connect if not already connected
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      console.log(`[WebSocket] Starting connection...`);
      connect();
    } else {
      console.log(
        `[WebSocket] Already connected, state: ${wsRef.current.readyState}`
      );
    }

    // Cleanup on unmount only (not on re-renders)
    return () => {
      console.log(
        `[WebSocket] Cleaning up connection for project ${projectId}`
      );
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // Only reconnect when projectId changes

  return {
    messages,
    sendMessage,
    isConnected,
    isConnecting,
    error,
    reconnect,
    connectionMode,
  };
}

/**
 * Show browser notification for new message
 *
 * NOTE: Currently DISABLED in favor of Web Push notifications sent by backend.
 * Backend sends push notifications via service worker (see sw.js) which provides
 * better reliability and works even when the tab is closed.
 */
function showNotification(message: Message) {
  // Check if notifications are supported
  if (!("Notification" in window)) {
    console.warn("Browser does not support notifications");
    return;
  }

  // Check permission
  if (Notification.permission === "granted") {
    const notification = new Notification(
      `New message from ${message.sender_username}`,
      {
        body:
          message.text.substring(0, 100) +
          (message.text.length > 100 ? "..." : ""),
        tag: `message-${message.uuid}`, // Prevents duplicate notifications
        requireInteraction: false,
        icon: "/notification_icon.png",
        silent: false, // Ensure sound is not muted
      }
    );

    // Play system sound (most browsers will play default notification sound)
    playNotificationSound();

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } else if (Notification.permission !== "denied") {
    // Request permission if not denied
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        showNotification(message);
      }
    });
  }
}

// Cache audio element to reuse it
let notificationAudio: HTMLAudioElement | null = null;
let audioInitialized = false;

/**
 * Initialize audio element on first user interaction to bypass browser autoplay restrictions
 * Call this function when user interacts with the page (click, keypress, etc.)
 */
export function initializeNotificationAudio() {
  if (audioInitialized) return;

  try {
    notificationAudio = new Audio("/notification.mp3");
    notificationAudio.volume = 0.5;
    notificationAudio.preload = "auto";

    // Play and immediately pause to "prime" the audio for autoplay
    notificationAudio
      .play()
      .then(() => {
        if (notificationAudio) {
          notificationAudio.pause();
          notificationAudio.currentTime = 0;
          audioInitialized = true;
          console.log("Notification audio initialized successfully");
        }
      })
      .catch((err) => {
        console.log("Audio initialization failed, will use fallback:", err);
      });
  } catch (err) {
    console.log("Audio initialization error:", err);
  }
}

/**
 * Play notification sound
 * Uses the notification.mp3 file from public folder, similar to how notification_icon.png is used
 */
function playNotificationSound() {
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
        playPromise
          .then(() => {
            console.log("Notification sound played successfully");
          })
          .catch((err) => {
            console.log("Notification sound play failed:", err);
            // Fall back to system notification sound if custom sound fails
            playSystemNotificationSound();
          });
      }
    } else {
      // Fallback: create new audio element
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => {
        console.log("Fallback audio play failed:", err);
        playSystemNotificationSound();
      });
    }
  } catch (err) {
    console.log("Notification sound error:", err);
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

    console.log("Fallback system notification sound played");
  } catch (err) {
    console.log("Fallback notification sound also failed:", err);
  }
}

/**
 * Update document title with unread count
 */
export function updateUnreadBadge(count: number) {
  const baseTitle = "1769 Dashboard";
  document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
}
