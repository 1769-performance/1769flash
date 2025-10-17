/**
 * Real-time project messaging component
 *
 * Features:
 * - Real-time message updates via WebSocket
 * - Fallback to REST API if WebSocket unavailable
 * - Auto-scroll to latest message
 * - Loading states and error handling
 */

"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Message, useProjectMessages } from "@/hooks/use-project-messages";
import { getJson, postJson } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Check, Loader2, RefreshCw, Send, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ProjectMessagesProps {
  projectId: string;
  projectTitle?: string;
  onMessagesRead?: () => void;
}

export function ProjectMessages({
  projectId,
  projectTitle,
  onMessagesRead,
}: ProjectMessagesProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { messages, sendMessage, isConnected, isConnecting, error, reconnect } =
    useProjectMessages({
      projectId,
      currentUsername: user?.user?.username,
      autoReconnect: true,
      onMessage: (msg) => {
        console.log("New message received:", msg);
      },
      onError: (err) => {
        console.error("WebSocket error:", err);
      },
    });

  // Check if message is from current user
  const isOwnMessage = (msg: Message) => {
    return msg.sender_username === user?.user?.username;
  };

  // Check if message is a system/admin notification
  const isSystemMessage = (msg: Message) => {
    // Assuming admin messages have a specific flag or username pattern
    // Adjust this logic based on your backend implementation
    return msg.sender_username === "admin" || msg.sender_username === "system";
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const data = await getJson<{ unread_count: number }>(
        `/projects/${projectId}/messages/unread-count/`
      );
      const count = data.unread_count || 0;
      console.log("Fetched unread count:", count);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  // Mark messages as read
  const markMessagesRead = async () => {
    try {
      console.log("Marking messages as read...");
      await postJson(`/projects/${projectId}/messages/read/`, {});
      console.log("Successfully marked messages as read");
      setUnreadCount(0);
      // Call the callback to notify parent component
      onMessagesRead?.();
      // Optionally verify by refetching unread count after a short delay
      setTimeout(() => {
        fetchUnreadCount();
      }, 500);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  // Initialize unread count and mark as read on component mount
  useEffect(() => {
    fetchUnreadCount();
  }, [projectId]);

  // Mark messages as read when unreadCount is updated and > 0
  useEffect(() => {
    console.log("Unread count changed:", unreadCount);
    if (unreadCount > 0) {
      console.log("Setting timer to mark messages as read in 2 seconds...");
      const timer = setTimeout(() => {
        markMessagesRead();
      }, 2000); // Wait 2 seconds before marking as read

      return () => {
        console.log("Clearing timer");
        clearTimeout(timer);
      };
    }
  }, [unreadCount]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = inputText.trim();
    if (!text) return;

    setIsSending(true);

    try {
      if (isConnected) {
        // Send via WebSocket (instant)
        sendMessage(text);
      } else {
        // Fallback to REST API (automatically includes CSRF token)
        await postJson(`/projects/${projectId}/messages/`, { text });
      }

      setInputText("");
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const getConnectionStatus = () => {
    if (isConnecting) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Connecting...
        </Badge>
      );
    }

    if (isConnected) {
      return (
        <Badge
          variant="default"
          className="flex items-center gap-1 bg-green-600"
        >
          <Wifi className="h-3 w-3" />
          Real-time
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Messages display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Messages</CardTitle>
            {/* Connection status and unread count inside card header */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {unreadCount} unread
                </Badge>
              )}
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={markMessagesRead}
                  className="h-7 text-xs"
                  title="Mark all messages as read"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark as read
                </Button>
              )}
              {getConnectionStatus()}
              {!isConnected && !isConnecting && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reconnect}
                  className="h-7"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reconnect
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Messages list with dark mode support */}
            <div className="h-96 overflow-y-auto rounded-lg p-4 space-y-3 bg-background">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = isOwnMessage(msg);
                  const isSystem = isSystemMessage(msg);

                  return (
                    <div
                      key={msg.uuid}
                      className={cn(
                        "flex",
                        isSystem
                          ? "justify-center"
                          : isOwn
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-lg p-3 max-w-[70%]",
                          isSystem
                            ? "bg-muted text-muted-foreground text-center"
                            : isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {!isSystem && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {msg.sender_username}
                            </span>
                            <span
                              className={cn(
                                "text-xs",
                                isOwn
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {new Date(msg.created).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                        {isSystem && (
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {new Date(msg.created).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1"
              />
              <Button type="submit" disabled={isSending || !inputText.trim()}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </>
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
