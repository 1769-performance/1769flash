"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Plus } from "lucide-react"
import { postJson, getJson, type Vehicle } from "@/lib/api"

interface NewProjectDialogProps {
  onProjectCreated: () => void
}

export function NewProjectDialog({ onProjectCreated }: NewProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    vehicle_vin: "",
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)

  // Fetch vehicles when dialog opens
  useEffect(() => {
    const fetchVehicles = async () => {
      if (open) {
        setVehiclesLoading(true)
        try {
          const vehicleData = await getJson<{ results: Vehicle[] }>("/vehicles/")
          setVehicles(vehicleData.results || [])
        } catch (error) {
          console.error("Failed to fetch vehicles:", error)
          setVehicles([])
        } finally {
          setVehiclesLoading(false)
        }
      }
    }

    fetchVehicles()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      await postJson("/projects/", formData)
      setFormData({ title: "", vehicle_vin: "" })
      setOpen(false)
      onProjectCreated()
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleVehicleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      vehicle_vin: value,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>Start a new project by providing a title and selecting a vehicle.</DialogDescription>
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
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter project title"
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_vin">Vehicle</Label>
              {vehiclesLoading ? (
                <div className="flex items-center justify-center py-2">
                  <span className="text-sm text-muted-foreground">Loading vehicles...</span>
                </div>
              ) : (
                <Select value={formData.vehicle_vin} onValueChange={handleVehicleChange} required disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.length === 0 ? (
                      <SelectItem value="no-vehicles" disabled>
                        No vehicles available
                      </SelectItem>
                    ) : (
                      vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.vin} value={vehicle.vin}>
                          <div className="flex flex-col">
                            <span className="font-medium">{vehicle.vin}</span>
                            {vehicle.series && <span className="text-xs text-muted-foreground">{vehicle.series}</span>}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {errors.vehicle_vin && <p className="text-sm text-destructive">{errors.vehicle_vin[0]}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
