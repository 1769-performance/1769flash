"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Cpu, Car, ExternalLink, User } from "lucide-react"
import Link from "next/link"
import { getJson, type ECU, type Log } from "@/lib/api"
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
    <div className="p-6">
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
                  ECU {ecu.serial}
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
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">{ecu.serial}</p>
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