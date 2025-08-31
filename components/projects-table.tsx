"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import type { Project } from "@/lib/api"

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ongoing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  finished: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

interface ProjectsTableProps {
  projects: Project[]
  showDealerColumn?: boolean
  vehicleDealer?: string
  loading?: boolean
  className?: string
}

export function ProjectsTable({ 
  projects, 
  showDealerColumn = false, 
  vehicleDealer,
  loading = false,
  className 
}: ProjectsTableProps) {
  const router = useRouter()

  const columns = [
    ...(showDealerColumn ? [{
      key: "dealer" as keyof Project,
      header: "Dealer",
      render: (dealer: string, project: Project) => {
        // Only show dealer if it's different from vehicle dealer
        if (vehicleDealer && dealer === vehicleDealer) return null
        return <span className="text-sm text-muted-foreground">{dealer}</span>
      },
    }] : []),
    {
      key: "title" as keyof Project,
      header: "Title",
      render: (title: string) => <span className="font-medium">{title}</span>,
    },
    {
      key: "status" as keyof Project,
      header: "Status",
      render: (status: string) => (
        <Badge 
          variant="secondary" 
          className={statusColors[status] || ""}
        >
          {status}
        </Badge>
      ),
    },
    {
      key: "created" as keyof Project,
      header: "Created",
      render: (created: string) => (
        <span className="text-sm text-muted-foreground">
          {new Date(created).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "unread_count" as keyof Project,
      header: "Unread",
      render: (unread: string | number) => {
        const count = typeof unread === 'string' ? parseInt(unread) : unread
        return count > 0 ? (
          <Badge variant="destructive" className="text-xs">
            {count}
          </Badge>
        ) : null
      },
    },
    {
      key: "modified" as keyof Project,
      header: "Modified",
      render: (modified: string) => (
        <span className="text-sm text-muted-foreground">
          {new Date(modified).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const handleRowClick = (project: Project) => {
    router.push(`/projects/${project.uuid}`)
  }

  return (
    <DataTable
      data={projects}
      columns={columns}
      loading={loading}
      onRowClick={handleRowClick}
      className={className}
    />
  )
}