"use client";

import { DataTable } from "@/components/data-table";
import { ListFilters } from "@/components/list-filters";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { UnreadCountProvider, useUnreadCounts } from "@/hooks/use-unread-counts";
import type { Project } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const statusColors = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  required_customer_action:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  required_dealer_action:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const statusLabels = {
  new: "New",
  required_customer_action: "Required Customer Action",
  required_dealer_action: "Required Dealer Action",
  completed: "Completed",
  closed: "Closed",
};

function ProjectsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshAllCounts, unreadCounts } = useUnreadCounts();

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [ordering, setOrdering] = useState<string>("-created");

  const {
    data: projects,
    loading,
    error,
    refetch,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    currentPage,
    totalPages,
    updateParams,
  } = usePaginatedList<Project>("/projects/", {
    initialParams: {
      status: statusFilter === "all" ? "" : statusFilter,
      search: search,
      ordering: ordering,
    },
  });

  // Update params when filters change (with debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({
        status: statusFilter === "all" ? "" : statusFilter,
        search: search,
        ordering: ordering,
      });
    }, 300); // Debounce for 300ms
    return () => clearTimeout(timer);
  }, [statusFilter, search, ordering, updateParams]);

  // Handle immediate search on Enter key
  const handleSearchSubmit = () => {
    updateParams({
      status: statusFilter === "all" ? "" : statusFilter,
      search: search,
      ordering: ordering,
    });
  };

  
  // Refresh unread counts periodically and when page becomes visible
  useEffect(() => {
    // Initial refresh
    refreshAllCounts();

    // Set up periodic refresh
    const interval = setInterval(() => {
      refreshAllCounts();
    }, 60000); // Refresh every minute

    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAllCounts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshAllCounts]);

  // Dynamic columns based on user role
  const columns = [
    {
      key: "title" as keyof Project,
      header: "Title",
    },
    {
      key: "status" as keyof Project,
      header: "Status",
      render: (status: string) => (
        <Badge
          variant="secondary"
          className={statusColors[status as keyof typeof statusColors]}
        >
          {statusLabels[status as keyof typeof statusLabels] || status}
        </Badge>
      ),
    },
    {
      key: "vehicle" as keyof Project,
      header: "VIN",
    },
    // Show Dealer column only if user is customer
    ...(user?.profile_type === "customer"
      ? [
          {
            key: "dealer" as keyof Project,
            header: "Dealer",
          },
        ]
      : []),
    // Show Customer column only if user is dealer
    ...(user?.profile_type === "dealer"
      ? [
          {
            key: "customer" as keyof Project,
            header: "Customer",
          },
        ]
      : []),
    {
      key: "created" as keyof Project,
      header: "Created",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      key: "unread_count" as keyof Project,
      header: "Unread",
      render: (_, project: Project) => {
        // Use real-time unread count from context, fallback to API data
        const realTimeCount = unreadCounts[project.uuid];
        const apiCount = project.unread_count ? parseInt(project.unread_count) : 0;
        const count = realTimeCount !== undefined ? realTimeCount : apiCount;

        return count > 0 ? (
          <Badge variant="destructive">{count}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "modified" as keyof Project,
      header: "Modified",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const handleResetFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setOrdering("-created");
  };

  const handleRowClick = (project: Project) => {
    router.push(`/projects/${project.uuid}`);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 ml-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your tuning requests</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.profile_type === "customer" && (
            <NewProjectDialog onProjectCreated={refetch} />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ListFilters
          searchValue={search}
          searchPlaceholder="Search title, VIN, names..."
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          filterFields={[
            {
              id: "status",
              label: "Status",
              content: (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="required_customer_action">
                      Required Customer Action
                    </SelectItem>
                    <SelectItem value="required_dealer_action">
                      Required Dealer Action
                    </SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
          ]}
          sortField={
            <Select value={ordering} onValueChange={setOrdering}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created">Newest first</SelectItem>
                <SelectItem value="created">Oldest first</SelectItem>
                <SelectItem value="-modified">Recently modified</SelectItem>
                <SelectItem value="modified">
                  Least recently modified
                </SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="-title">Title Z-A</SelectItem>
              </SelectContent>
            </Select>
          }
          onReset={handleResetFilters}
          hasActiveFilters={
            statusFilter !== "all" || search !== "" || ordering !== "-created"
          }
          activeFilterCount={
            [statusFilter !== "all", search !== ""].filter(Boolean).length
          }
        />
      </div>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error loading projects: {error?.message || "Unknown error"}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            Click on a project to view details and manage it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={projects}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            pagination={{
              currentPage,
              totalPages,
              hasNext,
              hasPrev,
              onNext: nextPage,
              onPrev: prevPage,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();

  return (
    <UnreadCountProvider
      currentUserId={user?.user?.id}
      profileUuid={user?.profile?.uuid}
      username={user?.user?.username}
    >
      <ProjectsPageContent />
    </UnreadCountProvider>
  );
}
