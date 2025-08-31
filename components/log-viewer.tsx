"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DataTable } from "@/components/data-table"
import { Eye, Search, Filter } from "lucide-react"
import { getJson } from "@/lib/api"

interface Log {
  uuid: string
  name: string
  comment?: string
  url: string
  created: string
}

interface LogsResponse {
  count: number
  results: Log[]
}

interface LogDetail {
  uuid: string
  name: string
  comment?: string
  url: string
  created: string
  content?: string
}

interface LogViewerProps {
  fileUuid: string
}

const LOG_LEVELS = ["INFO", "WARN", "ERROR", "DEBUG", "TRACE"]

export function LogViewer({ fileUuid }: LogViewerProps) {
  const [logs, setLogs] = useState<Log[]>([])
  const [selectedLog, setSelectedLog] = useState<LogDetail | null>(null)
  const [logContent, setLogContent] = useState("")
  const [filteredContent, setFilteredContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLevels, setSelectedLevels] = useState<string[]>(LOG_LEVELS)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      // Handle both paginated shape {count, results} and bare arrays/single items
      const data = await getJson<LogsResponse | Log[] | Log>(`/files/${fileUuid}/logs/`)

      if (Array.isArray(data)) {
        setLogs(data)
      } else if (data && typeof data === "object" && "results" in data && Array.isArray((data as LogsResponse).results)) {
        setLogs((data as LogsResponse).results)
      } else if (data && typeof data === "object" && "uuid" in data) {
        setLogs([data as Log])
      } else {
        setLogs([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLogDetail = async (logUuid: string) => {
    setLoadingDetail(true)
    try {
      const data = await getJson<LogDetail>(`/files/${fileUuid}/logs/${logUuid}/`)
      setSelectedLog(data)

      // Fetch log content from URL if available
      if (data.url) {
        const response = await fetch(data.url)
        const content = await response.text()
        setLogContent(content)
      } else {
        setLogContent("No log content available")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load log details")
    } finally {
      setLoadingDetail(false)
    }
  }

  const filterLogContent = () => {
    if (!logContent) {
      setFilteredContent("")
      return
    }

    let filtered = logContent

    // Filter by search term
    if (searchTerm) {
      const lines = logContent.split("\n")
      const matchingLines = lines.filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
      filtered = matchingLines.join("\n")
    }

    // Filter by log levels
    if (selectedLevels.length < LOG_LEVELS.length) {
      const lines = filtered.split("\n")
      const levelPattern = new RegExp(`\\b(${selectedLevels.join("|")})\\b`, "i")
      const matchingLines = lines.filter((line) => selectedLevels.length === 0 || levelPattern.test(line))
      filtered = matchingLines.join("\n")
    }

    setFilteredContent(filtered)
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUuid])

  useEffect(() => {
    filterLogContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logContent, searchTerm, selectedLevels])

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]))
  }

  const logColumns = [
    {
      key: "name" as keyof Log,
      header: "Log Name",
      render: (name: string) => <span className="font-mono text-sm">{name}</span>,
    },
    {
      key: "comment" as keyof Log,
      header: "Comment",
      render: (comment: string) => comment || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "created" as keyof Log,
      header: "Created",
      render: (date: string) => new Date(date).toLocaleString(),
    },
    // Use a real field key ("uuid") to host the Actions cell
    {
      key: "uuid" as keyof Log,
      header: "Actions",
      render: (_uuid: string, log: Log) => (
        <Button variant="outline" size="sm" onClick={() => fetchLogDetail(log.uuid)} disabled={loadingDetail}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Logs</CardTitle>
          <CardDescription>Select a log file to view its contents</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={logs}
            columns={logColumns}
            loading={loading}
            emptyMessage={!loading && !error ? "No logs available for this file." : undefined}
          />
        </CardContent>
      </Card>

      {selectedLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Log Content: {selectedLog.name}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48"
                  />
                </div>
              </div>
            </CardTitle>
            <CardDescription>Filter by log level and search through log content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Log Levels:</span>
                {LOG_LEVELS.map((level) => (
                  <Badge
                    key={level}
                    variant={selectedLevels.includes(level) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleLevel(level)}
                  >
                    {level}
                  </Badge>
                ))}
                <Button variant="outline" size="sm" onClick={() => setSelectedLevels(LOG_LEVELS)}>
                  All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedLevels([])}>
                  None
                </Button>
              </div>

              {loadingDetail ? (
                <div className="animate-pulse">
                  <div className="h-64 bg-muted rounded" />
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-96">
                    {filteredContent || logContent || "No log content available"}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
