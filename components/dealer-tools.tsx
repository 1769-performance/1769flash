"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DataTable } from "@/components/data-table"
import { FileUploadDialog } from "@/components/file-upload-dialog"
import { LogViewer } from "@/components/log-viewer"
import { FileText, Eye, Download, RefreshCw } from "lucide-react"
import { getJson, type ECU } from "@/lib/api"

// Avoid conflict with DOM's global File interface
interface EcuLog {
  uuid: string
  name: string
  comment?: string
  url: string
  created: string
}

interface EcuFile {
  uuid: string
  name: string
  comment?: string
  url: string
  created: string
  logs?: EcuLog[]
}

interface FilesResponse {
  count: number
  results: EcuFile[]
}

interface DealerToolsProps {
  projectUuid: string
  ecus: ECU[]
}

export function DealerTools({ projectUuid, ecus }: DealerToolsProps) {
  const [selectedEcu, setSelectedEcu] = useState<ECU | null>(null)
  const [files, setFiles] = useState<EcuFile[]>([])
  const [selectedFile, setSelectedFile] = useState<EcuFile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const fetchFiles = async (ecuSerial: string) => {
    console.log('fetchFiles called for ECU:', ecuSerial)
    setLoading(true)
    setError(null)
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now()
      // API can return paginated {count, results}, or sometimes a direct list/single object
      const data = await getJson<FilesResponse | EcuFile[] | EcuFile>(`/ecus/${ecuSerial}/files/?_t=${timestamp}`)
      console.log('fetchFiles received data:', data)

      if (Array.isArray(data)) {
        console.log('Setting files from array:', data.length, 'files')
        setFiles(data)
      } else if (data && typeof data === "object" && "results" in data && Array.isArray((data as FilesResponse).results)) {
        console.log('Setting files from paginated response:', (data as FilesResponse).results.length, 'files')
        setFiles((data as FilesResponse).results)
      } else if (data && typeof data === "object" && "uuid" in data) {
        console.log('Setting files from single object')
        setFiles([data as EcuFile])
      } else {
        console.log('No files found, setting empty array')
        setFiles([])
      }
    } catch (err) {
      console.error('fetchFiles error:', err)
      setError(err instanceof Error ? err.message : "Failed to load files")
      setFiles([])
    } finally {
      setLoading(false)
      console.log('fetchFiles completed, loading set to false')
    }
  }

  const handleEcuSelect = (ecuSerial: string) => {
    const ecu = ecus.find((e) => e.serial === ecuSerial) || null
    setSelectedEcu(ecu)
    setSelectedFile(null)
    if (ecu) fetchFiles(ecu.serial)
  }

  const handleFileUploaded = () => {
    console.log('handleFileUploaded called, selectedEcu:', selectedEcu?.serial)
    if (selectedEcu) {
      // Show success message
      setUploadSuccess(true)
      console.log('Simulating ECU card click for refresh, ECU:', selectedEcu.serial)

      // Simulate clicking on the ECU card by deselecting and reselecting
      const currentEcu = selectedEcu
      setSelectedEcu(null) // Deselect first
      setFiles([]) // Clear files

      // After a brief delay, reselect the ECU to trigger a fresh load
      setTimeout(() => {
        console.log('Reselecting ECU:', currentEcu.serial)
        setSelectedEcu(currentEcu) // Reselect to trigger fresh fetch
      }, 300)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false)
      }, 3000)
    }
  }

  const fileColumns = [
    {
      key: "name" as keyof EcuFile,
      header: "File Name",
      render: (name: string) => <span className="font-mono text-sm dark:text-blue-300">{name}</span>,
    },
    {
      key: "comment" as keyof EcuFile,
      header: "Comment",
      render: (comment: string) => comment || <span className="text-muted-foreground dark:text-gray-400">—</span>,
    },
    {
      key: "created" as keyof EcuFile,
      header: "Uploaded",
      render: (date: string) => <span className="dark:text-gray-300">{new Date(date).toLocaleString()}</span>,
    },
    // Use a real key on the row (uuid) so generic DataTable types stay happy
    {
      key: "uuid" as keyof EcuFile,
      header: "Actions",
      render: (_uuid: string, file: EcuFile) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedFile(file)}
            disabled={!file.logs || file.logs.length === 0}
            className="dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-200"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-200"
          >
            <a href={file.url} download target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ECU Files</CardTitle>
          <CardDescription>Manage files for project ECUs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ecu-select">Select ECU</Label>
              <Select onValueChange={handleEcuSelect}>
                <SelectTrigger id="ecu-select" className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                  <SelectValue placeholder="Choose an ECU to manage files" />
                </SelectTrigger>
                <SelectContent className="dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                  {ecus.map((ecu) => (
                    <SelectItem key={ecu.serial} value={ecu.serial} className="dark:focus:bg-gray-700">
                      {ecu.name} ({ecu.serial}) — {ecu.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEcu && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium dark:text-gray-200">Files for {selectedEcu.name}</h4>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">Serial: {selectedEcu.serial} ({files.length} files)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('Manual refresh triggered')
                        fetchFiles(selectedEcu.serial)
                      }}
                      disabled={loading}
                      className="dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-200"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                    <FileUploadDialog ecuSerial={selectedEcu.serial} onFileUploaded={handleFileUploaded} />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {uploadSuccess && (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      File uploaded successfully! Refreshing file list...
                    </AlertDescription>
                  </Alert>
                )}

                <DataTable
                  data={files}
                  columns={fileColumns}
                  loading={loading}
                  emptyMessage={
                    !loading && !error
                      ? "No files yet for this ECU."
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Logs: {selectedFile.name}
            </CardTitle>
            <CardDescription>View processing logs for this file</CardDescription>
          </CardHeader>
          <CardContent>
            <LogViewer fileUuid={selectedFile.uuid} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
