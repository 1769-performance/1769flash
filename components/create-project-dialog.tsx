"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { getJson, postJson, type ECU } from "@/lib/api"

interface CreateProjectDialogProps {
  vehicleVin: string
  triggerText?: string
}

export function CreateProjectDialog({ vehicleVin, triggerText = "Create Project" }: CreateProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [ecus, setEcus] = useState<ECU[]>([])
  const [selectedEcuSerials, setSelectedEcuSerials] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadingEcus, setLoadingEcus] = useState(false)

  // Fetch ECUs when dialog opens
  useEffect(() => {
    const fetchEcus = async () => {
      if (!open || !vehicleVin) return

      setLoadingEcus(true)
      try {
        const response = await getJson<{ results: ECU[] }>(`/vehicles/${vehicleVin}/ecus/?limit=50`)
        const ecuList = response.results || []
        setEcus(ecuList)
        // Auto-select all ECUs by default
        setSelectedEcuSerials(ecuList.map((ecu) => ecu.serial))
      } catch (error) {
        console.error("Failed to load ECUs:", error)
        setErrors({ general: ["Failed to load ECUs. Please try again."] })
      } finally {
        setLoadingEcus(false)
      }
    }

    fetchEcus()
  }, [open, vehicleVin])

  const formatEcuLabel = (ecu: ECU) => {
    const prefix = ecu.address === 18 ? "Engine" : ecu.address === 24 ? "Transmission" : "Other"
    return `${prefix} [${ecu.type} - ${ecu.name}]`
  }

  const toggleEcu = (serial: string) => {
    setSelectedEcuSerials((prev) =>
      prev.includes(serial) ? prev.filter((s) => s !== serial) : [...prev, serial]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const project = await postJson("/projects/", {
        title: title.trim(),
        vehicle_vin: vehicleVin,
        ecu_serials: selectedEcuSerials,
      })
      setTitle("")
      setSelectedEcuSerials([])
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Start a new project by providing a title and selecting a vehicle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general[0]}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading || loadingEcus}
                placeholder="Enter project title"
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_vin">Vehicle</Label>
              <Input id="vehicle_vin" value={vehicleVin} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Select ECUs</Label>
              {loadingEcus ? (
                <div className="text-sm text-muted-foreground">Loading ECUs...</div>
              ) : ecus.length === 0 ? (
                <div className="text-sm text-muted-foreground">No ECUs found for this vehicle</div>
              ) : (
                <div className="space-y-2 border rounded-md p-4">
                  {ecus.map((ecu) => (
                    <div key={ecu.serial} className="flex items-center space-x-2">
                      <Checkbox
                        id={ecu.serial}
                        checked={selectedEcuSerials.includes(ecu.serial)}
                        onCheckedChange={() => toggleEcu(ecu.serial)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={ecu.serial}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {formatEcuLabel(ecu)}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {errors.ecu_serials && <p className="text-sm text-destructive">{errors.ecu_serials[0]}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || selectedEcuSerials.length === 0}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
