/**
 * Global unread message count management
 *
 * Provides real-time unread count tracking across all projects
 * with WebSocket integration and browser tab notifications
 */

import React from "react";
import { getJson } from "@/lib/api";
import { useCallback, useContext, useEffect, useState } from "react";

interface UnreadCounts {
  [projectId: string]: number;
}

interface UnreadCountContextType {
  unreadCounts: UnreadCounts;
  totalUnread: number;
  updateProjectUnread: (projectId: string, count: number) => void;
  refreshAllCounts: () => Promise<void>;
  markProjectRead: (projectId: string) => void;
  isLoading: boolean;
  currentUserId?: number;
  profileUuid?: string;
  username?: string;
}

const UnreadCountContext = React.createContext<UnreadCountContextType | null>(null);

export function useUnreadCounts() {
  const context = useContext(UnreadCountContext);
  if (!context) {
    throw new Error("useUnreadCounts must be used within UnreadCountProvider");
  }
  return context;
}

interface UnreadCountProviderProps {
  children: React.ReactNode;
  currentUserId?: number;
  profileUuid?: string;
  username?: string;
}

export function UnreadCountProvider({ children, currentUserId, profileUuid, username }: UnreadCountProviderProps) {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate total unread whenever counts change
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    setTotalUnread(total);

    // Update browser tab title with unread count
    updateTabBadge(total);
  }, [unreadCounts]);

  // Update browser tab title with unread count
  const updateTabBadge = useCallback((count: number) => {
    const baseTitle = "1769 Dashboard";
    const newTitle = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
    document.title = newTitle;
  }, []);

  // Update unread count for a specific project
  const updateProjectUnread = useCallback((projectId: string, count: number) => {
    setUnreadCounts(prev => ({
      ...prev,
      [projectId]: count
    }));
  }, []);

  // Mark project as read (set count to 0)
  const markProjectRead = useCallback((projectId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [projectId]: 0
    }));
  }, []);

  // Refresh all unread counts from API
  const refreshAllCounts = useCallback(async () => {
    if (!profileUuid) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await getJson<{ results: Array<{ uuid: string; unread_count: number }> }>(
        "/projects/"
      );

      const counts: UnreadCounts = {};
      response.results?.forEach(project => {
        counts[project.uuid] = project.unread_count || 0;
      });

      setUnreadCounts(counts);

    } catch (error) {
      console.error("Failed to refresh unread counts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profileUuid, username]);

  // Initial load of unread counts
  useEffect(() => {
    refreshAllCounts();
  }, [refreshAllCounts]);

  // Listen for unread count updates via WebSocket
  useEffect(() => {
    const handleUnreadUpdate = (event: CustomEvent) => {
      const { sender_username } = event.detail;

      // Only update counts for the current user (not the sender)
      if (sender_username !== username) {
        refreshAllCounts();
      }
    };

    // Listen for custom events from WebSocket
    window.addEventListener('unreadCountUpdate', handleUnreadUpdate as EventListener);

    return () => {
      window.removeEventListener('unreadCountUpdate', handleUnreadUpdate as EventListener);
    };
  }, [username, refreshAllCounts]);

  const contextValue: UnreadCountContextType = {
    unreadCounts,
    totalUnread,
    updateProjectUnread,
    refreshAllCounts,
    markProjectRead,
    isLoading,
    currentUserId,
    profileUuid,
    username,
  };

  return (
    <UnreadCountContext.Provider value={contextValue}>
      {children}
    </UnreadCountContext.Provider>
  );
}

// Utility function to dispatch unread count updates from WebSocket hooks
export function dispatchUnreadCountUpdate(data: {
  project_uuid: string;
  dealer_unread: number;
  customer_unread: number;
  sender_id: number;
}) {
  window.dispatchEvent(new CustomEvent('unreadCountUpdate', { detail: data }));
}