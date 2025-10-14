"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { type Project, patchJson } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Info, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

interface EnhancedProjectHeaderProps {
  project: Project
  onProjectUpdate?: (updatedProject: Project) => void
}

type ProjectStatus = Project["status"]

interface StatusConfig {
  label: string
  color: string
  description: string
  whoCanSet: string
}

const statusConfig: Record<ProjectStatus, StatusConfig> = {
  new: {
    label: "New",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    description: "Project just created and hasn't been worked on yet.",
    whoCanSet: "Automatically set when project is created",
  },
  required_customer_action: {
    label: "Required Customer Action",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    description: "Dealer has completed work and is waiting for customer to review and respond.",
    whoCanSet: "Can only be set by dealer",
  },
  required_dealer_action: {
    label: "Required Dealer Action",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    description: "Customer has responded and is waiting for dealer to take action.",
    whoCanSet: "Can only be set by customer",
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    description: "Work is finished and both parties are satisfied. Project can be reopened if needed.",
    whoCanSet: "Can be set by dealer or customer",
  },
  closed: {
    label: "Closed",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    description: "Project is paid and permanently closed. Cannot be reopened.",
    whoCanSet: "Can only be set by dealer when project is completed",
  },
}

// Permission logic based on current status and user role
function getAvailableStatuses(
  currentStatus: ProjectStatus,
  userRole: "dealer" | "customer"
): ProjectStatus[] {
  if (currentStatus === "closed") {
    return [] // Closed status is immutable
  }

  if (userRole === "dealer") {
    switch (currentStatus) {
      case "new":
        return ["required_customer_action", "completed", "closed"]
      case "required_customer_action":
        return [] // Must wait for customer
      case "required_dealer_action":
        return ["required_customer_action", "completed", "closed"]
      case "completed":
        return ["required_customer_action", "closed"] // Can only reopen or close
      default:
        return []
    }
  } else {
    // customer
    switch (currentStatus) {
      case "new":
        return ["required_dealer_action", "completed"]
      case "required_customer_action":
        return ["required_dealer_action", "completed"]
      case "required_dealer_action":
        return [] // Must wait for dealer
      case "completed":
        return ["required_dealer_action"] // Can only reopen
      default:
        return []
    }
  }
}

export function EnhancedProjectHeader({
  project,
  onProjectUpdate,
}: EnhancedProjectHeaderProps) {
  const { user } = useAuth()
  const [currentStatus, setCurrentStatus] = useState<ProjectStatus>(project.status)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const userRole = user?.profile_type as "dealer" | "customer" | undefined
  const availableStatuses = userRole
    ? getAvailableStatuses(currentStatus, userRole)
    : []
  const canChangeStatus = availableStatuses.length > 0

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    // Show confirmation dialog only for "closed" status
    if (newStatus === "closed") {
      setPendingStatus(newStatus)
      setShowConfirmClose(true)
      return
    }

    await updateStatus(newStatus)
  }

  const updateStatus = async (newStatus: ProjectStatus) => {
    setIsUpdating(true)
    const previousStatus = currentStatus

    try {
      // Optimistic update
      setCurrentStatus(newStatus)

      // API call
      const updatedProject = await patchJson<Project>(
        `/projects/${project.uuid}/`,
        { status: newStatus }
      )

      // Success
      toast.success("Project status updated", {
        description: `Status changed to "${statusConfig[newStatus].label}"`,
      })

      // Notify parent component
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject)
      }
    } catch (error) {
      // Rollback on error
      setCurrentStatus(previousStatus)
      toast.error("Failed to update status", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsUpdating(false)
      setShowConfirmClose(false)
      setPendingStatus(null)
    }
  }

  const confirmCloseProject = async () => {
    if (pendingStatus) {
      await updateStatus(pendingStatus)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {project.title}
              </h1>

              {canChangeStatus ? (
                <Select
                  value={currentStatus}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-fit">
                    <Badge
                      variant="secondary"
                      className={statusConfig[currentStatus].color}
                    >
                      {statusConfig[currentStatus].label}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        <Badge
                          variant="secondary"
                          className={statusConfig[status].color}
                        >
                          {statusConfig[status].label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="secondary"
                  className={statusConfig[currentStatus].color}
                >
                  {statusConfig[currentStatus].label}
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExplanation(!showExplanation)}
                className="ml-auto"
              >
                <Info className="h-4 w-4 mr-1" />
                Status Info
                {showExplanation ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>

            <Collapsible open={showExplanation}>
              <CollapsibleContent className="space-y-2">
                <div className="rounded-md bg-muted p-4 text-sm space-y-3">
                  <h3 className="font-semibold">Project Status Explanations:</h3>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={config.color}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {config.whoCanSet}
                        </span>
                      </div>
                      <p className="text-muted-foreground pl-2">
                        {config.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

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

      {/* Confirmation Dialog for Closing Project */}
      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently close the project and it cannot be reopened.
              Make sure all work is completed and payment is received before closing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCloseProject}
              disabled={isUpdating}
            >
              {isUpdating ? "Closing..." : "Close Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
