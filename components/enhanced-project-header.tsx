"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardHeader } from "@/components/ui/card"
import { type Project } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

interface EnhancedProjectHeaderProps {
  project: Project
}

const statusColors = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ongoing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  finished: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
} as const

export function EnhancedProjectHeader({
  project
}: EnhancedProjectHeaderProps) {
  const { user } = useAuth()
  
  return (
    <Card>
      <CardHeader className="pb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {project.title}
            </h1>
            <Badge
              variant="secondary"
              className={statusColors[project.status as keyof typeof statusColors]}
            >
              {project.status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">VIN:</span>
              <p className="font-mono text-xs mt-1 break-all">{project.vehicle}</p>
            </div>
            
            <div>
              <span className="font-medium text-muted-foreground">
                {user?.profile_type === "customer" ? "Dealer:" : "Customer:"}
              </span>
              <p className="mt-1">
                {user?.profile_type === "customer" ? project.dealer : project.customer}
              </p>
            </div>
            
            <div>
              <span className="font-medium text-muted-foreground">Created:</span>
              <p className="mt-1">{new Date(project.created).toLocaleDateString()}</p>
            </div>
            
            <div>
              <span className="font-medium text-muted-foreground">Modified:</span>
              <p className="mt-1">{new Date(project.modified).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}