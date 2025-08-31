"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { NewProjectDialog } from "@/components/new-project-dialog"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useAuth } from "@/hooks/use-auth"
import type { Project } from "@/lib/api"

const statusColors = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ongoing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  finished: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export default function ProjectsPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState<string>("")
  const [ordering, setOrdering] = useState<string>("-created")

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
    }
  })

  // Update params when filters change (with debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({
        status: statusFilter === "all" ? "" : statusFilter,
        search: search,
        ordering: ordering,
      })
    }, 300) // Debounce for 300ms
    return () => clearTimeout(timer)
  }, [statusFilter, search, ordering, updateParams])

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
        <Badge variant="secondary" className={statusColors[status as keyof typeof statusColors]}>
          {status}
        </Badge>
      ),
    },
    {
      key: "vehicle" as keyof Project,
      header: "VIN",
    },
    // Show Dealer column only if user is customer
    ...(user?.profile_type === "customer" ? [{
      key: "dealer" as keyof Project,
      header: "Dealer",
    }] : []),
    // Show Customer column only if user is dealer  
    ...(user?.profile_type === "dealer" ? [{
      key: "customer" as keyof Project,
      header: "Customer",
    }] : []),
    {
      key: "created" as keyof Project,
      header: "Created",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      key: "unread_count" as keyof Project,
      header: "Unread",
      render: (count: string) =>
        count && count !== "0" ? (
          <Badge variant="destructive">{count}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "modified" as keyof Project,
      header: "Modified",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ]

  const handleResetFilters = () => {
    setStatusFilter("all")
    setSearch("")
    setOrdering("-created")
  }

  const handleRowClick = (project: Project) => {
    router.push(`/projects/${project.uuid}`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 ml-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your automotive projects</p>
        </div>
        {user?.profile_type === "customer" && (
          <NewProjectDialog onProjectCreated={refetch} />
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>Filter and search your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search title, VIN, names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ordering">Sort by</Label>
              <Select value={ordering} onValueChange={setOrdering}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created">Newest first</SelectItem>
                  <SelectItem value="created">Oldest first</SelectItem>
                  <SelectItem value="-modified">Recently modified</SelectItem>
                  <SelectItem value="modified">Least recently modified</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                  <SelectItem value="-title">Title Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </div>
          </div>
          
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading projects: {error?.message || 'Unknown error'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>Click on a project to view details and manage it</CardDescription>
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
  )
}
