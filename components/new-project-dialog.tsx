"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { postJson, getJson, type Vehicle, type ECU } from "@/lib/api"

interface NewProjectDialogProps {
  onProjectCreated: () => void
}

export function NewProjectDialog({ onProjectCreated }: NewProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    vehicle_vin: "",
    dealer_uuid: "", // Optional dealer override
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [ecus, setEcus] = useState<ECU[]>([])
  const [selectedEcuSerials, setSelectedEcuSerials] = useState<string[]>([])
  const [ecusLoading, setEcusLoading] = useState(false)
  const [defaultDealer, setDefaultDealer] = useState<string>("")

  // Check URL hash on mount to auto-open dialog
  useEffect(() => {
    if (window.location.hash === '#new-project') {
      setOpen(true)
    }
  }, [])

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

  // Fetch ECUs and set default dealer when vehicle is selected
  useEffect(() => {
    const fetchEcus = async () => {
      if (!formData.vehicle_vin) {
        setEcus([])
        setSelectedEcuSerials([])
        setDefaultDealer("")
        setFormData((prev) => ({ ...prev, dealer_uuid: "" }))
        return
      }

      setEcusLoading(true)
      try {
        // Fetch vehicle details to get default dealer
        const vehicleData = await getJson<Vehicle>(`/vehicles/${formData.vehicle_vin}/`)
        console.log("Vehicle data:", vehicleData)
        if (vehicleData.dealer) {
          console.log("Setting default dealer:", vehicleData.dealer)
          setDefaultDealer(vehicleData.dealer)
          setFormData((prev) => ({ ...prev, dealer_uuid: "" })) // Clear override, will use default
        } else {
          console.log("No dealer found in vehicle data")
        }

        // Fetch ECUs
        const response = await getJson<{ results: ECU[] }>(`/vehicles/${formData.vehicle_vin}/ecus/?limit=50`)
        const ecuList = response.results || []
        console.log("ECUs loaded:", ecuList.length)

        // Filter ECUs per address: prefer 1769 type for each address if it exists, otherwise use original
        // Group ECUs by address
        const ecusByAddress: Record<number, ECU[]> = {}
        ecuList.forEach((ecu) => {
          if (!ecusByAddress[ecu.address]) {
            ecusByAddress[ecu.address] = []
          }
          ecusByAddress[ecu.address].push(ecu)
        })

        // For each address, select 1769 if present, otherwise original
        const filteredEcus: ECU[] = []
        Object.entries(ecusByAddress).forEach(([address, ecusAtAddress]) => {
          const has1769 = ecusAtAddress.some((ecu) => ecu.type === "1769")
          if (has1769) {
            // Use 1769 ECUs for this address
            filteredEcus.push(...ecusAtAddress.filter((ecu) => ecu.type === "1769"))
            console.log(`Address ${address}: Found 1769 ECU(s), using 1769`)
          } else {
            // Use original ECUs for this address
            filteredEcus.push(...ecusAtAddress.filter((ecu) => ecu.type === "original"))
            console.log(`Address ${address}: No 1769 ECU, using original`)
          }
        })

        console.log("Filtered ECUs:", filteredEcus.length)
        setEcus(filteredEcus)
        // Auto-select all ECUs by default
        setSelectedEcuSerials(filteredEcus.map((ecu) => ecu.serial))
      } catch (error) {
        console.error("Failed to load vehicle/ECUs:", error)
        setEcus([])
        setSelectedEcuSerials([])
        setDefaultDealer("")
      } finally {
        setEcusLoading(false)
      }
    }

    fetchEcus()
  }, [formData.vehicle_vin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const payload: any = {
        title: formData.title,
        vehicle_vin: formData.vehicle_vin,
        ecu_serials: selectedEcuSerials,
      }

      // Only send dealer_uuid if it's been changed from default
      if (formData.dealer_uuid) {
        payload.dealer_uuid = formData.dealer_uuid
      }

      await postJson("/projects/", payload)
      setFormData({ title: "", vehicle_vin: "", dealer_uuid: "" })
      setEcus([])
      setSelectedEcuSerials([])
      setDefaultDealer("")
      setOpen(false)
      onProjectCreated()
    } catch (error: any) {
      console.error("Project creation error:", error)

      // Check if it's an ApiError with validationErrors
      if (error.validationErrors) {
        console.log("Validation errors:", error.validationErrors)
        setErrors(error.validationErrors)
      } else if (error.data && typeof error.data === "object") {
        // Fallback: try to use error.data as validation errors
        console.log("Error data:", error.data)
        setErrors(error.data)
      } else if (error.message) {
        // Show the error message
        setErrors({ general: [error.message] })
      } else {
        setErrors({ general: ["Failed to create project. Please try again."] })
      }
    } finally {
      setLoading(false)
    }
  }

  const formatEcuLabel = (ecu: ECU) => {
    const prefix = ecu.address === 18 ? "Engine" : ecu.address === 24 ? "Transmission" : "Other"
    return `${prefix} [${ecu.type} - ${ecu.name}]`
  }

  const toggleEcu = (serial: string) => {
    setSelectedEcuSerials((prev) =>
      prev.includes(serial) ? prev.filter((s) => s !== serial) : [...prev, serial]
    )
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
        <Button id="new-project">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* Dealer Field - Only show when vehicle is selected */}
            {formData.vehicle_vin && (
              <div className="space-y-2">
                <Label htmlFor="dealer_uuid">Dealer</Label>
                <div className="space-y-2">
                  {defaultDealer ? (
                    <>
                      <Input
                        id="dealer_display"
                        value={defaultDealer}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default dealer from vehicle. To change dealer, enter dealer UUID or username below:
                      </p>
                    </>
                  ) : ecusLoading ? (
                    <div className="text-sm text-muted-foreground">Loading dealer info...</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No dealer assigned to this vehicle</div>
                  )}
                  <Input
                    id="dealer_uuid"
                    name="dealer_uuid"
                    value={formData.dealer_uuid}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter dealer UUID or username (optional)"
                  />
                </div>
                {errors.dealer_uuid && <p className="text-sm text-destructive">{errors.dealer_uuid[0]}</p>}
              </div>
            )}

            {/* ECU Selection - Only show when vehicle is selected */}
            {formData.vehicle_vin && (
              <div className="space-y-2">
                <Label>Select ECUs</Label>
                {ecusLoading ? (
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
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.vehicle_vin || selectedEcuSerials.length === 0}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
