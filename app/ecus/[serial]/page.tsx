"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Cpu, Car, ExternalLink, User, UserPlus } from "lucide-react"
import Link from "next/link"
import { getJson, patchJson, type ECU, type Log, type Customer } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { EcuPanel } from "@/components/ecu-panel"
import { ChartVisualizer } from "@/components/chart-visualizer"
import {
  formatManufacturingDate,
  formatAddress,
  getEcuTypeInfo
} from "@/lib/ecu-utils"

export default function EcuDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const [ecu, setEcu] = useState<ECU | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEcuSerial, setSelectedEcuSerial] = useState<string | null>(null)

  // Chart visualization state
  const [chartLog, setChartLog] = useState<Log | null>(null)
  const [chartModalOpen, setChartModalOpen] = useState(false)

  // Customer assignment state (for dealers)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [assigningCustomer, setAssigningCustomer] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [assignmentSuccess, setAssignmentSuccess] = useState(false)

  useEffect(() => {
    const fetchEcu = async () => {
      if (!params.serial) return

      try {
        setLoading(true)
        const ecuData = await getJson<ECU>(`/ecus/${params.serial}/`)
        setEcu(ecuData)
        setSelectedEcuSerial(ecuData.serial)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ECU")
      } finally {
        setLoading(false)
      }
    }

    fetchEcu()
  }, [params.serial])

  // Fetch customers for dealers
  useEffect(() => {
    const fetchCustomers = async () => {
      if (user?.profile_type !== "dealer") return

      try {
        const response = await getJson<{ results: Customer[] } | Customer[]>("/accounts/customers/")
        // Handle both paginated and non-paginated responses
        const customersData = Array.isArray(response) ? response : response.results || []
        setCustomers(customersData)
      } catch (err) {
        console.error("Failed to load customers:", err)
      }
    }

    fetchCustomers()
  }, [user?.profile_type])

  // Set selected customer when ECU data is loaded or updated
  useEffect(() => {
    if (ecu?.customer && customers.length > 0) {
      // Find customer UUID from the customer string (username)
      const customer = customers.find(c => c.user.username === ecu.customer)
      if (customer) {
        setSelectedCustomer(customer.uuid)
      }
    }
  }, [ecu?.customer, customers])

  const refetchEcu = async () => {
    if (!params.serial) return
    try {
      const ecuData = await getJson<ECU>(`/ecus/${params.serial}/`)
      setEcu(ecuData)
    } catch (err) {
      console.error("Failed to refetch ECU data:", err)
    }
  }

  const handleLogVisualize = (log: Log) => {
    setChartLog(log)
    setChartModalOpen(true)
  }

  const handleChartClose = () => {
    setChartModalOpen(false)
    setChartLog(null)
  }

  const handleAssignCustomer = async () => {
    if (!selectedCustomer || !params.serial) return

    try {
      setAssigningCustomer(true)
      setAssignmentError(null)
      setAssignmentSuccess(false)

      await patchJson(`/ecus/${params.serial}/`, {
        customer: selectedCustomer,
      })

      // Refetch ECU to update display
      await refetchEcu()
      setAssignmentSuccess(true)
      // Don't clear selection - keep showing the assigned customer

      // Clear success message after 3 seconds
      setTimeout(() => setAssignmentSuccess(false), 3000)
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "Failed to assign customer")
    } finally {
      setAssigningCustomer(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !ecu) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error || "ECU not found"}</p>
            <Button asChild className="mt-4">
              <Link href="/ecus">Back to ECUs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ecuTypeInfo = getEcuTypeInfo(ecu.type)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6 ml-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ecus">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ECUs
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* ECU Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-6 w-6" />
                  ECU
                </CardTitle>
                <CardDescription>ECU details and file management</CardDescription>
              </div>
              <Badge variant="secondary" className={`${ecuTypeInfo.color} text-lg px-3 py-1`}>
                {ecuTypeInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                <p className="text-sm font-mono mt-1">{ecu.serial}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm mt-1">{ecu.name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">BMW Name</p>
                <p className="text-sm mt-1">{ecu.name_BMW}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-sm font-mono mt-1">{formatAddress(ecu.address)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Manufacturing Date</p>
                <p className="text-sm mt-1">{formatManufacturingDate(ecu.man_date)}</p>
              </div>
              
              {ecu.vehicle && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono">{ecu.vehicle}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/vehicles/${ecu.vehicle}`}>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Role-based info display */}
              {user?.profile_type === "customer" && ecu.dealer && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dealer</p>
                  <p className="text-sm mt-1">{ecu.dealer}</p>
                </div>
              )}
              
              {user?.profile_type === "dealer" && ecu.customer && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="text-sm mt-1">{ecu.customer}</p>
                </div>
              )}
              
              {ecu.name_esys && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">E-Sys Name</p>
                  <p className="text-sm mt-1">{ecu.name_esys}</p>
                </div>
              )}
              
              {ecu.name_a2l && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">A2L Name</p>
                  <p className="text-sm mt-1">{ecu.name_a2l}</p>
                </div>
              )}
              
              {ecu.istep && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">I-Step</p>
                  <p className="text-sm mt-1">{ecu.istep}</p>
                </div>
              )}
              
              {ecu.mcu_id && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MCU ID</p>
                  <p className="text-sm font-mono mt-1">{ecu.mcu_id}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Assignment (Dealers only) */}
        {user?.profile_type === "dealer" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Assign Customer
              </CardTitle>
              <CardDescription>
                Assign this ECU to a customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger className="w-full sm:w-[300px]">
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.uuid} value={customer.uuid}>
                          {customer.user.username} ({customer.user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssignCustomer}
                    disabled={!selectedCustomer || assigningCustomer}
                  >
                    {assigningCustomer ? "Assigning..." : "Assign Customer"}
                  </Button>
                </div>

                {assignmentSuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-md text-sm">
                    Customer assigned successfully!
                  </div>
                )}

                {assignmentError && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                    {assignmentError}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ECU Panel for SVT/SVK and File Management */}
        <EcuPanel
          ecus={[ecu]}
          selectedEcuSerial={selectedEcuSerial}
          onEcuClick={setSelectedEcuSerial}
          isDealer={user?.profile_type === "dealer"}
          onFileUploaded={refetchEcu}
          onLogVisualize={handleLogVisualize}
        />

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Available actions for this ECU
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ecu.vehicle && (
                <Button variant="outline" asChild>
                  <Link href={`/vehicles/${ecu.vehicle}`}>
                    <Car className="h-4 w-4 mr-2" />
                    View Vehicle
                  </Link>
                </Button>
              )}
              
              <Button variant="outline" asChild>
                <Link href="/ecus">
                  <Cpu className="h-4 w-4 mr-2" />
                  Back to ECU List
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Visualizer Modal */}
      <ChartVisualizer
        log={chartLog}
        open={chartModalOpen}
        onClose={handleChartClose}
      />
    </div>
  )
}