"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FolderPlus } from "lucide-react"
import { postJson } from "@/lib/api"

interface CreateProjectDialogProps {
  vehicleVin: string
  triggerText?: string
}

export function CreateProjectDialog({ vehicleVin, triggerText = "Create Project" }: CreateProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const project = await postJson("/projects/", {
        title: title.trim(),
        vehicle_vin: vehicleVin,
      })
      setTitle("")
      setOpen(false)
      router.push(`/projects/${project.uuid}`)
    } catch (error: any) {
      if (error.status === 400) {
        const errorData = await error.json()
        setErrors(errorData)
      } else {
        setErrors({ general: ["Failed to create project. Please try again."] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="h-4 w-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Create a new project for vehicle {vehicleVin}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general[0]}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="vehicle_vin">VIN</Label>
              <Input id="vehicle_vin" value={vehicleVin} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter project title"
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
