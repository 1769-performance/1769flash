"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea
} from "recharts"
import {
  parseCsvData,
  filterDataByTimeRange,
  downsampleData,
  type ParsedCsvData,
  type ChartColumn
} from "@/lib/csv-parser"
import { type Log } from "@/lib/api"

interface ChartVisualizerProps {
  log: Log | null
  open: boolean
  onClose: () => void
}

interface VisibleColumn extends ChartColumn {
  visible: boolean // Selected in sidebar (checkbox)
  shown: boolean // Currently shown on chart (can be toggled from legend)
  yAxisId: 'left' | 'right'
}

export function ChartVisualizer({ log, open, onClose }: ChartVisualizerProps) {
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumn[]>([])
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Chart selection state for datazap.me-style interaction
  const [isSelecting, setIsSelecting] = useState(false)
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('')
  const [refAreaRight, setRefAreaRight] = useState<string | number>('')

  // Enhanced control functions
  const resetZoom = useCallback(() => {
    setTimeRange([0, 100])
    setRefAreaLeft('')
    setRefAreaRight('')
  }, [])

  const zoomIn = useCallback(() => {
    const range = timeRange[1] - timeRange[0]
    const center = (timeRange[0] + timeRange[1]) / 2
    const newRange = range / 1.5
    setTimeRange([
      Math.max(0, center - newRange / 2),
      Math.min(100, center + newRange / 2)
    ])
  }, [timeRange])

  const zoomOut = useCallback(() => {
    const range = timeRange[1] - timeRange[0]
    const center = (timeRange[0] + timeRange[1]) / 2
    const newRange = Math.min(100, range * 1.5)
    setTimeRange([
      Math.max(0, center - newRange / 2),
      Math.min(100, center + newRange / 2)
    ])
  }, [timeRange])

  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setVisibleColumns(prev =>
      prev.map(col =>
        col.key === columnKey
          ? { ...col, visible: !col.visible, shown: !col.visible } // When toggling sidebar checkbox, also set shown state
          : col
      )
    )
  }, [])

  const toggleColumnShown = useCallback((columnKey: string) => {
    setVisibleColumns(prev =>
      prev.map(col =>
        col.key === columnKey
          ? { ...col, shown: !col.shown } // Only toggle shown state (for legend clicks)
          : col
      )
    )
  }, [])

  const setColumnYAxis = useCallback((columnKey: string, yAxisId: 'left' | 'right') => {
    setVisibleColumns(prev =>
      prev.map(col =>
        col.key === columnKey
          ? { ...col, yAxisId }
          : col
      )
    )
  }, [])

  const toggleAllColumns = useCallback((visible: boolean) => {
    setVisibleColumns(prev =>
      prev.map(col => ({ ...col, visible, shown: visible }))
    )
  }, [])

  // Format time in mm:ss or hh:mm:ss format
  const formatTime = useCallback((seconds: number) => {
    const absSeconds = Math.abs(seconds)
    const hours = Math.floor(absSeconds / 3600)
    const minutes = Math.floor((absSeconds % 3600) / 60)
    const secs = Math.floor(absSeconds % 60)
    const ms = Math.floor((absSeconds % 1) * 1000)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    } else if (secs > 0) {
      return `${secs}.${ms.toString().padStart(3, '0').slice(0, 2)}s`
    } else {
      return `0.${ms.toString().padStart(3, '0')}s`
    }
  }, [])

  // Chart selection handlers - datazap.me style
  const handleMouseDown = useCallback((e: any) => {
    if (e && e.activeLabel !== undefined) {
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges()
      }
      setRefAreaLeft(e.activeLabel)
      setRefAreaRight(e.activeLabel)
      setIsSelecting(true)
    }
  }, [])

  const handleMouseMove = useCallback((e: any) => {
    if (isSelecting && e && e.activeLabel !== undefined) {
      setRefAreaRight(e.activeLabel)
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges()
      }
    }
  }, [isSelecting])

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft !== '' && refAreaRight !== '' && refAreaLeft !== refAreaRight && csvData) {
      const left = Math.min(Number(refAreaLeft), Number(refAreaRight))
      const right = Math.max(Number(refAreaLeft), Number(refAreaRight))

      const totalTime = csvData.timeRange.max - csvData.timeRange.min
      const leftPercent = ((left - csvData.timeRange.min) / totalTime) * 100
      const rightPercent = ((right - csvData.timeRange.min) / totalTime) * 100

      setTimeRange([Math.max(0, leftPercent), Math.min(100, rightPercent)])
    }

    setRefAreaLeft('')
    setRefAreaRight('')
    setIsSelecting(false)

    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }
  }, [refAreaLeft, refAreaRight, csvData])

  // Load and parse CSV data when log changes
  useEffect(() => {
    if (!log || !open) return

    const loadCsvData = async () => {
      setLoading(true)
      setError(null)

      try {
        const proxyUrl = log.file_uuid
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${log.file_uuid}/logs/${log.uuid}/content`
          : log.url

        const response = await fetch(proxyUrl, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch log file: ${response.statusText}`)
        }

        const csvContent = await response.text()
        const parsedData = await parseCsvData(csvContent)

        setCsvData(parsedData)

        // Initialize ALL columns (not just first 6)
        const initialColumns: VisibleColumn[] = parsedData.columns.map((col) => ({
          ...col,
          visible: false, // Start with all hidden in sidebar
          shown: false, // Start with all hidden on chart
          yAxisId: col.yAxis === 'left' ? 'left' : 'right'
        }))

        setVisibleColumns(initialColumns)
        setTimeRange([0, 100])

        console.log(`Loaded ${parsedData.totalRows} data points in ${parsedData.columns.length} columns`)

      } catch (err) {
        console.error('Error loading CSV data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load CSV data')
      } finally {
        setLoading(false)
      }
    }

    loadCsvData()
  }, [log, open])

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        resetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, zoomIn, zoomOut, resetZoom])

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!csvData) return []

    const totalTime = csvData.timeRange.max - csvData.timeRange.min
    const startTime = csvData.timeRange.min + (totalTime * timeRange[0] / 100)
    const endTime = csvData.timeRange.min + (totalTime * timeRange[1] / 100)

    const maxPoints = timeRange[1] - timeRange[0] < 10 ? 2000 : 1000
    const filtered = filterDataByTimeRange(csvData.data, startTime, endTime)
    return downsampleData(filtered, maxPoints)
  }, [csvData, timeRange])

  // Get data columns (exclude time column)
  const dataColumns = useMemo(() => {
    return visibleColumns.filter(col => col.key !== 'time' && !col.key.includes('time'))
  }, [visibleColumns])

  const downloadChart = useCallback(() => {
    if (!filteredData.length) return

    const visibleCols = dataColumns.filter(col => col.visible && col.shown)
    const headers = ['time', ...visibleCols.map(col => col.name)]
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.time,
        ...visibleCols.map(col => row[col.key] || '')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${log?.name || 'chart'}_filtered.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredData, dataColumns, log?.name])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <Card className="p-2 shadow-lg border bg-background/95 backdrop-blur-sm max-w-xs">
        <div className="space-y-1">
          <p className="font-medium text-xs">Time: {formatTime(Number(label))}</p>
          {payload.slice(0, 8).map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-1 text-xs">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate max-w-[120px]" title={entry.name}>{entry.name}:</span>
              <span className="font-medium ml-auto">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          ))}
          {payload.length > 8 && (
            <p className="text-xs text-muted-foreground">+{payload.length - 8} more</p>
          )}
        </div>
      </Card>
    )
  }

  // Custom Legend with click to toggle - only shows channels selected in sidebar
  const CustomLegend = () => {
    const selectedChannels = dataColumns.filter(col => col.visible) // Only channels checked in sidebar

    if (selectedChannels.length === 0) return null

    return (
      <div className="flex flex-wrap gap-3 justify-center items-center pt-2 px-4">
        {selectedChannels.map((column) => (
          <button
            key={`legend-${column.key}`}
            onClick={() => toggleColumnShown(column.key)}
            className={`flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
              column.shown
                ? 'opacity-100 hover:opacity-70'
                : 'opacity-40 hover:opacity-60'
            }`}
            title={column.shown ? 'Click to hide from chart' : 'Click to show on chart'}
          >
            <div
              className="w-2.5 h-2.5 rounded-sm border"
              style={{
                backgroundColor: column.shown ? column.color : 'transparent',
                borderColor: column.color
              }}
            />
            <span className={column.shown ? 'font-medium' : 'line-through'}>
              {column.name}
            </span>
          </button>
        ))}
      </div>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <h2 className="font-semibold text-sm truncate max-w-[300px]">{log?.name}</h2>
            {csvData && (
              <Badge variant="outline" className="text-xs">
                {csvData.totalRows.toLocaleString()} pts • {csvData.columns.length} channels
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={zoomIn} className="h-7 px-2">
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={zoomOut} className="h-7 px-2">
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={resetZoom} className="h-7 px-2">
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadChart} className="h-7 px-2">
              <Download className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 px-2">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Main Content: Left Sidebar + Chart */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar - Column Selector */}
          {!sidebarCollapsed && (
            <div className="w-72 border-r bg-muted/10 flex flex-col flex-shrink-0 overflow-hidden">
              {/* Sidebar Header */}
              <div className="p-3 border-b space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Channels</h3>
                  <Badge variant="secondary" className="text-xs">
                    {dataColumns.filter(c => c.visible).length} / {dataColumns.length}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllColumns(true)}
                    className="text-xs h-7 flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Show All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllColumns(false)}
                    className="text-xs h-7 flex-1"
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide All
                  </Button>
                </div>
              </div>

              {/* Column List */}
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {dataColumns.map((column) => (
                    <div
                      key={column.key}
                      className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    >
                      {/* Checkbox for visibility */}
                      <Checkbox
                        checked={column.visible}
                        onCheckedChange={() => toggleColumnVisibility(column.key)}
                      />

                      {/* Color indicator */}
                      <div
                        className="w-3 h-3 rounded-sm border border-border/50"
                        style={{ backgroundColor: column.color }}
                      />

                      {/* Column name - truncates in grid column */}
                      <span
                        className="text-xs truncate cursor-pointer"
                        title={column.name}
                        onClick={() => toggleColumnVisibility(column.key)}
                      >
                        {column.name}
                      </span>

                      {/* L/R axis toggle */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => setColumnYAxis(column.key, 'left')}
                          className={`h-6 w-6 text-xs font-bold rounded border transition-colors ${
                            column.yAxisId === 'left'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-muted'
                          }`}
                          title="Left axis"
                        >
                          L
                        </button>
                        <button
                          onClick={() => setColumnYAxis(column.key, 'right')}
                          className={`h-6 w-6 text-xs font-bold rounded border transition-colors ${
                            column.yAxisId === 'right'
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-muted'
                          }`}
                          title="Right axis"
                        >
                          R
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background border border-l-0 rounded-r-md p-1 hover:bg-muted transition-colors"
            style={{ left: sidebarCollapsed ? '0' : '288px' }}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Chart Area */}
          <div className="flex-1 relative">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-muted-foreground">Loading Chart Data</p>
                    <p className="text-sm text-muted-foreground mt-1">Parsing CSV and preparing visualization...</p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <Card className="p-6 max-w-md mx-auto">
                  <div className="text-center space-y-3">
                    <TrendingUp className="h-8 w-8 text-destructive mx-auto" />
                    <div>
                      <p className="text-sm text-destructive font-medium">Error loading chart</p>
                      <p className="text-xs text-muted-foreground mt-1">{error}</p>
                    </div>
                    <Button size="sm" onClick={onClose}>Close</Button>
                  </div>
                </Card>
              </div>
            ) : filteredData.length > 0 ? (
              <div className="h-full p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredData}
                    margin={{ top: 10, right: 40, left: 40, bottom: 20 }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" strokeWidth={0.5} />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="linear"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => formatTime(value)}
                      fontSize={11}
                      stroke="#64748b"
                      tickCount={8}
                      height={30}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      fontSize={11}
                      stroke="#64748b"
                      width={45}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      fontSize={11}
                      stroke="#64748b"
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      content={<CustomLegend />}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      iconSize={10}
                    />

                    {dataColumns
                      .filter(col => col.visible && col.shown) // Must be checked in sidebar AND shown on chart
                      .map((column) => (
                      <Line
                        key={column.key}
                        yAxisId={column.yAxisId}
                        type="monotone"
                        dataKey={column.key}
                        stroke={column.color}
                        strokeWidth={2}
                        dot={false}
                        name={column.name}
                        connectNulls={false}
                      />
                    ))}

                    {/* Selection area for zoom */}
                    {refAreaLeft !== '' && refAreaRight !== '' && (
                      <ReferenceArea
                        yAxisId="left"
                        x1={refAreaLeft}
                        x2={refAreaRight}
                        strokeOpacity={0.3}
                        fillOpacity={0.1}
                        stroke="#8884d8"
                        fill="#8884d8"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>

                {/* Instructions overlay */}
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm p-2 rounded-md border text-xs text-muted-foreground">
                  <p>💡 Click and drag on chart to zoom to selection</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No data to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
