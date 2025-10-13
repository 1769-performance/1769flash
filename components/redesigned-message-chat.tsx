"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getJson, postJson, type PaginatedResponse } from "@/lib/api";
import { RefreshCw, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MessageData {
  uuid: string;
  text: string;
  created: string;
  sender_name: string;
  sender_username: string;
}

interface RedesignedMessageChatProps {
  projectUuid: string;
}

export function RedesignedMessageChat({
  projectUuid,
}: RedesignedMessageChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async (offset: number = 0, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const data = await getJson<PaginatedResponse<MessageData>>(
        `/projects/${projectUuid}/messages/?limit=20&offset=${offset}`
      );

      if (append) {
        setMessages((prev) => [...prev, ...data.results]);
      } else {
        setMessages(data.results);
        setCurrentOffset(0);
      }

      setHasNextPage(!!data.next);
      setCurrentOffset(offset + data.results.length);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasNextPage) {
      fetchMessages(currentOffset, true);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await getJson<{ unread_count: number }>(
        `/projects/${projectUuid}/messages/unread-count/`
      );
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  const markMessagesRead = async () => {
    try {
      await postJson(`/projects/${projectUuid}/messages/read/`, {});
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await postJson(`/projects/${projectUuid}/messages/`, {
        text: newMessage.trim(),
      });
      setNewMessage("");
      await fetchMessages(); // Refresh messages after sending
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const getMessageAlignment = (message: MessageData) => {
    const isCurrentUser = message.sender_username === user?.user.username;
    const isAdmin = message.sender_username === "admin";

    if (isAdmin) {
      return "center";
    } else if (isCurrentUser) {
      return "right";
    } else {
      return "left";
    }
  };

  const getMessageClasses = (alignment: string) => {
    switch (alignment) {
      case "center":
        return {
          container: "justify-center",
          bubble:
            "bg-muted border border-border text-muted-foreground max-w-[80%] text-center",
          icon: "text-muted-foreground",
        };
      case "right":
        return {
          container: "justify-end",
          bubble: "bg-primary text-primary-foreground max-w-[70%]",
          icon: "text-primary-foreground",
        };
      case "left":
      default:
        return {
          container: "justify-start",
          bubble: "bg-muted max-w-[70%]",
          icon: "text-muted-foreground",
        };
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();

    // Mark messages as read when component gains focus
    const handleFocus = () => {
      if (unreadCount > 0) {
        markMessagesRead();
      }
    };

    window.addEventListener("focus", handleFocus);

    // Poll for unread count every 15 seconds when page is hidden
    const interval = setInterval(() => {
      if (document.hidden) {
        fetchUnreadCount();
      }
    }, 15000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [projectUuid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-mark as read when messages are viewed
    if (messages.length > 0 && unreadCount > 0 && !document.hidden) {
      const timer = setTimeout(() => {
        markMessagesRead();
      }, 2000); // Mark as read after 2 seconds of viewing

      return () => clearTimeout(timer);
    }
  }, [messages, unreadCount]);

  return (
    <Card className="h-[700px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Messages</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unreadCount} unread
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchMessages()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto space-y-4 mb-4"
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-start">
                    <div className="max-w-[70%]">
                      <div className="h-4 bg-muted rounded w-20 mb-2" />
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {hasNextPage && (
                <div className="text-center py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load previous messages"}
                  </Button>
                </div>
              )}

              {messages.map((message) => {
                const alignment = getMessageAlignment(message);
                const classes = getMessageClasses(alignment);

                return (
                  <div
                    key={message.uuid}
                    className={`flex ${classes.container}`}
                  >
                    <div className={`rounded-lg p-3 ${classes.bubble}`}>
                      <div className="flex flex-col items-start mb-1">
                        <span className={`text-xs font-medium ${classes.icon}`}>
                          {alignment === "center" ? (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              System
                            </div>
                          ) : (
                            message.sender_username
                          )}
                        </span>
                        <span className={`text-xs opacity-70`}>
                          {new Date(message.created).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
