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
import { FileText, Eye, Download } from "lucide-react"
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

  const fetchFiles = async (ecuSerial: string) => {
    setLoading(true)
    setError(null)
    try {
      // API can return paginated {count, results}, or sometimes a direct list/single object
      const data = await getJson<FilesResponse | EcuFile[] | EcuFile>(`/ecus/${ecuSerial}/files/`)

      if (Array.isArray(data)) {
        setFiles(data)
      } else if (data && typeof data === "object" && "results" in data && Array.isArray((data as FilesResponse).results)) {
        setFiles((data as FilesResponse).results)
      } else if (data && typeof data === "object" && "uuid" in data) {
        setFiles([data as EcuFile])
      } else {
        setFiles([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files")
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const handleEcuSelect = (ecuSerial: string) => {
    const ecu = ecus.find((e) => e.serial === ecuSerial) || null
    setSelectedEcu(ecu)
    setSelectedFile(null)
    if (ecu) fetchFiles(ecu.serial)
  }

  const handleFileUploaded = () => {
    if (selectedEcu) fetchFiles(selectedEcu.serial)
  }

  const fileColumns = [
    {
      key: "name" as keyof EcuFile,
      header: "File Name",
      render: (name: string) => <span className="font-mono text-sm">{name}</span>,
    },
    {
      key: "comment" as keyof EcuFile,
      header: "Comment",
      render: (comment: string) => comment || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "created" as keyof EcuFile,
      header: "Uploaded",
      render: (date: string) => new Date(date).toLocaleString(),
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
          >
            <Eye className="h-4 w-4 mr-1" />
            View Logs
          </Button>
          <Button variant="outline" size="sm" asChild>
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
                <SelectTrigger id="ecu-select">
                  <SelectValue placeholder="Choose an ECU to manage files" />
                </SelectTrigger>
                <SelectContent>
                  {ecus.map((ecu) => (
                    <SelectItem key={ecu.serial} value={ecu.serial}>
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
                    <h4 className="font-medium">Files for {selectedEcu.name}</h4>
                    <p className="text-sm text-muted-foreground">Serial: {selectedEcu.serial}</p>
                  </div>
                  <FileUploadDialog ecuSerial={selectedEcu.serial} onFileUploaded={handleFileUploaded} />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
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
