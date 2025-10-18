"use client"

import type React from "react"

import { useState } from "react"
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
import { Plus } from "lucide-react"
import { postJson, getJson, type Vehicle } from "@/lib/api"
import { BuyFlasherLicenseDialog } from "@/components/buy-flasher-license-dialog"

interface AddVehicleDialogProps {
  onVehicleAdded: () => void
}

export function AddVehicleDialog({ onVehicleAdded }: AddVehicleDialogProps) {
  const [open, setOpen] = useState(false)
  const [vin, setVin] = useState("")
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  // License purchase dialog state
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false)
  const [createdVehicle, setCreatedVehicle] = useState<Vehicle | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const normalizedVin = vin.trim().toUpperCase()

      // Create the vehicle
      await postJson("/vehicles/", { vin: normalizedVin })

      // Fetch the created vehicle's details (including VinInfo fields)
      const vehicleData = await getJson<Vehicle>(`/vehicles/${normalizedVin}/`)

      // Close add vehicle dialog
      setVin("")
      setOpen(false)

      // Show license purchase dialog
      setCreatedVehicle(vehicleData)
      setLicenseDialogOpen(true)

      // Refresh vehicle list
      onVehicleAdded()
    } catch (error: any) {
      if (error.status === 400) {
        const errorData = await error.json()
        setErrors(errorData)
      } else {
        setErrors({ general: ["Failed to add vehicle. Please try again."] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>Add a vehicle by entering its 17-character VIN number.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {errors.general && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.general[0]}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter 17-character VIN"
                  maxLength={17}
                  className="uppercase"
                />
                {errors.vin && <p className="text-sm text-destructive">{errors.vin[0]}</p>}
                <p className="text-xs text-muted-foreground">VIN will be automatically converted to uppercase</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || vin.length !== 17}>
                {loading ? "Adding..." : "Add Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* License Purchase Dialog */}
      <BuyFlasherLicenseDialog
        open={licenseDialogOpen}
        onOpenChange={setLicenseDialogOpen}
        vehicle={createdVehicle}
      />
    </>
  )
}
