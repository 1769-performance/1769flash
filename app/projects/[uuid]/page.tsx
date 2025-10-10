"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EnhancedProjectHeader } from "@/components/enhanced-project-header"
import { RedesignedMessageChat } from "@/components/redesigned-message-chat"
import { EcuPanel } from "@/components/ecu-panel"
import { ChartVisualizer } from "@/components/chart-visualizer"

import { getJson, postFormData, type Project, type Vehicle, type ECU, type Log } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { usePaginatedList } from "@/hooks/use-paginated-list"

export default function ProjectDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [ecus, setEcus] = useState<ECU[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEcuSerial, setSelectedEcuSerial] = useState<string | null>(null)
  
  // Chart visualization state
  const [chartLog, setChartLog] = useState<Log | null>(null)
  const [chartModalOpen, setChartModalOpen] = useState(false)
  

  const isDealer = user?.profile_type === "dealer"
  const projectUuid = typeof params.uuid === "string" ? params.uuid : Array.isArray(params.uuid) ? params.uuid[0] : undefined

  // Load ECUs with nested data (SVTs, SVKs, Files, Logs)
  const loadEcusWithNestedData = async (vin: string) => {
    try {
      // Fetch ECUs with nested SVT/SVK data
      const ecuResponse = await getJson<{ results: ECU[] }>(`/vehicles/${vin}/ecus/?limit=50`)
      
      // For each ECU, fetch files and logs
      const ecusWithFiles = await Promise.all(
        ecuResponse.results.map(async (ecu) => {
          try {
            const filesResponse = await getJson<{ results: any[] }>(`/ecus/${ecu.serial}/files/?limit=50`)
            
            // For each file, fetch logs
            const filesWithLogs = await Promise.all(
              filesResponse.results.map(async (file) => {
                try {
                  const logsResponse = await getJson<{ results: any[] }>(`/files/${file.uuid}/logs/?limit=50`)
                  return {
                    ...file,
                    logs: logsResponse.results
                  }
                } catch {
                  return { ...file, logs: [] }
                }
              })
            )
            
            return {
              ...ecu,
              files: filesWithLogs
            }
          } catch {
            return { ...ecu, files: [] }
          }
        })
      )
      
      setEcus(ecusWithFiles)
    } catch (err) {
      console.error('Error loading ECUs:', err)
      setEcus([])
    }
  }

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectUuid) return

      try {
        setLoading(true)
        const projectData = await getJson<Project>(`/projects/${projectUuid}/`)
        setProject(projectData)

        if (projectData.vehicle) {
          // Load vehicle data
          const vehicleData = await getJson<Vehicle>(`/vehicles/${projectData.vehicle}/`)
          setVehicle(vehicleData)
          
          // Load ECUs with nested data
          await loadEcusWithNestedData(projectData.vehicle)
        } else {
          setVehicle(null)
          setEcus([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project")
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
  }, [projectUuid])

  const handleEcuClick = (serial: string) => {
    setSelectedEcuSerial(selectedEcuSerial === serial ? null : serial)
  }

  const handleFileUploadSuccess = async () => {
    // Reload ECUs data to show the new file
    if (project?.vehicle) {
      await loadEcusWithNestedData(project.vehicle)
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
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error || "Project not found"}</p>
            <Button asChild className="mt-4">
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-6 ml-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>

      {/* Main Layout */}
      <div className="space-y-6">
        {/* Enhanced Project Header */}
        <EnhancedProjectHeader
          project={project}
        />

        {/* Two-column layout: Messages + ECUs */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Messages Column */}
          <div className="lg:col-span-1">
            <RedesignedMessageChat projectUuid={project.uuid} />
          </div>

          {/* ECUs Column */}
          <div className="lg:col-span-1">
            <EcuPanel
              ecus={ecus}
              selectedEcuSerial={selectedEcuSerial}
              onEcuClick={handleEcuClick}
              isDealer={isDealer}
              projectUuid={project.uuid}
              onLogVisualize={handleLogVisualize}
              onFileUploaded={handleFileUploadSuccess}
            />
          </div>
        </div>
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