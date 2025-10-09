"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Settings,
  Palette,
  Filter,
  Maximize2
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
  ReferenceLine,
  ReferenceArea
} from "recharts"
import {
  parseCsvData,
  filterDataByTimeRange,
  downsampleData,
  getColumnStats,
  suggestYAxisGroupings,
  type ParsedCsvData,
  type ChartColumn,
  type ChartDataPoint
} from "@/lib/csv-parser"
import { type Log } from "@/lib/api"

interface ChartVisualizerProps {
  log: Log | null
  open: boolean
  onClose: () => void
}

interface VisibleColumn extends ChartColumn {
  visible: boolean
  yAxisId: 'left' | 'right' | number
}

export function ChartVisualizer({ log, open, onClose }: ChartVisualizerProps) {
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumn[]>([])
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100])
  const [selectedGrouping, setSelectedGrouping] = useState<string>('All')
  // Removed controlsVisible state - controls are always visible now
  const [activeTab, setActiveTab] = useState('controls')
  
  // Chart selection state for datazap.me-style interaction
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<number | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null)
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
          ? { ...col, visible: !col.visible }
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
      prev.map(col => ({ ...col, visible }))
    )
  }, [])

  // Chart selection handlers - datazap.me style
  const handleMouseDown = useCallback((e: any) => {
    if (e && e.activeLabel !== undefined) {
      // Prevent text selection during chart interaction
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
      // Prevent text selection while dragging
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges()
      }
    }
  }, [isSelecting])

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft !== '' && refAreaRight !== '' && refAreaLeft !== refAreaRight && csvData) {
      const left = Math.min(Number(refAreaLeft), Number(refAreaRight))
      const right = Math.max(Number(refAreaLeft), Number(refAreaRight))
      
      // Convert time values to percentage
      const totalTime = csvData.timeRange.max - csvData.timeRange.min
      const leftPercent = ((left - csvData.timeRange.min) / totalTime) * 100
      const rightPercent = ((right - csvData.timeRange.min) / totalTime) * 100
      
      setTimeRange([Math.max(0, leftPercent), Math.min(100, rightPercent)])
    }
    
    setRefAreaLeft('')
    setRefAreaRight('')
    setIsSelecting(false)
    
    // Clear any remaining text selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges()
    }
  }, [refAreaLeft, refAreaRight, csvData])

  // Load and parse CSV data when log changes - with performance optimizations
  useEffect(() => {
    if (!log || !open) return

    const loadCsvData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Use Django API proxy instead of direct Google Drive URL to avoid CORS
        const proxyUrl = log.file_uuid 
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/files/${log.file_uuid}/logs/${log.uuid}/content`
          : log.url // Fallback to direct URL if file_uuid is not available
        
        const response = await fetch(proxyUrl, {
          credentials: 'include', // Include cookies for authentication
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch log file: ${response.statusText}`)
        }
        
        // Stream the response for better performance with large files
        const csvContent = await response.text()
        
        // Parse CSV with performance optimizations
        const parsedData = await parseCsvData(csvContent)
        
        setCsvData(parsedData)
        
        // Initialize visible columns with better defaults - only show most important ones
        const initialColumns: VisibleColumn[] = parsedData.columns.slice(0, 6).map((col, index) => ({
          ...col,
          visible: index === 0 || (index <= 3 && col.name.toLowerCase().includes('engine')), // Only show engine-related by default
          yAxisId: col.yAxis === 'left' ? 'left' : 'right'
        }))
        
        setVisibleColumns(initialColumns)
        setTimeRange([0, 100])
        
        // Pre-calculate some stats for better performance
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
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        setControlsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, zoomIn, zoomOut, resetZoom])

  // Filter data based on time range - optimized for performance
  const filteredData = useMemo(() => {
    if (!csvData) return []
    
    const totalTime = csvData.timeRange.max - csvData.timeRange.min
    const startTime = csvData.timeRange.min + (totalTime * timeRange[0] / 100)
    const endTime = csvData.timeRange.min + (totalTime * timeRange[1] / 100)
    
    // Use more aggressive downsampling for initial load, then refine
    const maxPoints = timeRange[1] - timeRange[0] < 10 ? 2000 : 1000 // More points for zoomed views
    const filtered = filterDataByTimeRange(csvData.data, startTime, endTime)
    return downsampleData(filtered, maxPoints)
  }, [csvData, timeRange])

  // Get axis groupings
  const axisGroupings = useMemo(() => {
    if (!csvData) return {}
    return suggestYAxisGroupings(csvData.columns)
  }, [csvData])

  // Get columns for selected grouping
  const groupedColumns = useMemo(() => {
    if (!csvData || selectedGrouping === 'All') {
      return visibleColumns.filter(col => col.key !== 'time')
    }
    
    const groupColumns = axisGroupings[selectedGrouping] || []
    return visibleColumns.filter(col => 
      col.key !== 'time' && 
      groupColumns.some(groupCol => groupCol.key === col.key)
    )
  }, [visibleColumns, selectedGrouping, axisGroupings, csvData])

  const downloadChart = useCallback(() => {
    if (!filteredData.length) return
    
    const headers = ['time', ...groupedColumns.filter(col => col.visible).map(col => col.name)]
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.time,
        ...groupedColumns.filter(col => col.visible).map(col => row[col.key] || '')
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${log?.name || 'chart'}_filtered.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredData, groupedColumns, log?.name])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    return (
      <Card className="p-2 shadow-lg border bg-background/95 backdrop-blur-sm max-w-xs">
        <div className="space-y-1">
          <p className="font-medium text-xs">Time: {Number(label).toFixed(3)}s</p>
          {payload.slice(0, 5).map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-1 text-xs">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="truncate max-w-[80px]">{entry.name.split('(')[0]}:</span>
              <span className="font-medium">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          ))}
          {payload.length > 5 && (
            <p className="text-xs text-muted-foreground">+{payload.length - 5} more</p>
          )}
        </div>
      </Card>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background select-none">
      <div className="flex flex-col h-screen">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <h2 className="font-semibold text-sm truncate max-w-[300px]">{log?.name}</h2>
            {csvData && (
              <Badge variant="outline" className="text-xs">
                {csvData.totalRows.toLocaleString()} pts • {((csvData.timeRange.max - csvData.timeRange.min) / 60).toFixed(1)}min
              </Badge>
            )}
          </div>

          {/* Floating Action Buttons */}
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

        {/* Chart Area - Takes remaining space */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <div>
                  <p className="text-lg font-medium text-muted-foreground">Loading Chart Data</p>
                  <p className="text-sm text-muted-foreground mt-1">Parsing CSV and preparing visualization...</p>
                  <p className="text-xs text-muted-foreground mt-2">This may take a moment for large files</p>
                </div>
                <div className="w-64 bg-muted rounded-full h-1 mx-auto">
                  <div className="bg-primary h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
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
            <div className="h-full p-2 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={filteredData} 
                  margin={{ top: 10, right: 40, left: 40, bottom: 20 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{ userSelect: 'none' }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" strokeWidth={0.5} />
                  <XAxis 
                    dataKey="time" 
                    type="number"
                    scale="linear"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => `${value.toFixed(1)}s`}
                    fontSize={10}
                    stroke="#64748b"
                    tickCount={8}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left"
                    fontSize={10}
                    stroke="#64748b"
                    width={35}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    fontSize={10}
                    stroke="#64748b"
                    width={35}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                    iconSize={8}
                  />
                  
                  {groupedColumns
                    .filter(col => col.visible)
                    .slice(0, 5) // Limit to 5 lines for better performance
                    .map((column) => (
                    <Line
                      key={column.key}
                      yAxisId={column.yAxisId}
                      type="monotone"
                      dataKey={column.key}
                      stroke={column.color}
                      strokeWidth={1.5}
                      dot={false}
                      name={`${column.name}${column.unit ? ` (${column.unit})` : ''}`}
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
              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm p-2 rounded-md border text-xs text-muted-foreground">
                <p>💡 Click and drag on chart to zoom to selection</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No data to display</p>
            </div>
          )}
        </div>

        {/* Bottom Controls Panel - Always visible now */}
        <div className="h-48 bg-background border-t flex-shrink-0 select-text">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="px-3 pt-2 border-b">
                <TabsList className="grid w-full grid-cols-3 max-w-sm">
                  <TabsTrigger value="controls" className="flex items-center gap-1 text-xs">
                    <Settings className="h-3 w-3" />
                    Controls
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="flex items-center gap-1 text-xs">
                    <Filter className="h-3 w-3" />
                    Groups
                  </TabsTrigger>
                  <TabsTrigger value="series" className="flex items-center gap-1 text-xs">
                    <Palette className="h-3 w-3" />
                    Series
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="h-40 overflow-hidden">
                <TabsContent value="controls" className="h-full p-3 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
                    {/* Time Range Info */}
                    <Card className="p-3">
                      <div className="text-xs space-y-1">
                        <p className="font-medium">Time Range</p>
                        <p>{timeRange[0].toFixed(1)}% - {timeRange[1].toFixed(1)}%</p>
                        <p>Data Points: {filteredData.length.toLocaleString()}</p>
                      </div>
                    </Card>

                    {/* Chart Stats */}
                    <Card className="p-3">
                      <div className="text-xs space-y-1">
                        <p className="font-medium">Chart Info</p>
                        <p>Visible Series: {groupedColumns.filter(c => c.visible).length}</p>
                        <p>Total Columns: {visibleColumns.length}</p>
                        {csvData?.sampleRate && (
                          <p>Sample Rate: {(1/csvData.sampleRate).toFixed(1)} Hz</p>
                        )}
                      </div>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="p-3">
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Quick Actions</p>
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" onClick={() => toggleAllColumns(true)} className="text-xs h-6">
                            Show All
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleAllColumns(false)} className="text-xs h-6">
                            Hide All
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Keyboard Shortcuts */}
                    <Card className="p-3">
                      <div className="text-xs space-y-1">
                        <p className="font-medium">Shortcuts</p>
                        <p>+/- : Zoom in/out</p>
                        <p>R : Reset zoom</p>
                        <p>C : Toggle controls</p>
                        <p>ESC : Close</p>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="h-full p-3 mt-0">
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      <Button
                        size="sm"
                        variant={selectedGrouping === 'All' ? 'default' : 'outline'}
                        onClick={() => setSelectedGrouping('All')}
                        className="justify-start text-xs"
                      >
                        All ({visibleColumns.length})
                      </Button>
                      {Object.entries(axisGroupings).map(([groupName, columns]) => (
                        <Button
                          key={groupName}
                          size="sm"
                          variant={selectedGrouping === groupName ? 'default' : 'outline'}
                          onClick={() => setSelectedGrouping(groupName)}
                          className="justify-start text-xs"
                        >
                          {groupName} ({columns.length})
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="series" className="h-full p-3 mt-0">
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                      {groupedColumns.map((column) => {
                        const stats = csvData ? getColumnStats(filteredData, column.key) : null
                        
                        return (
                          <Card key={column.key} className="p-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <Switch
                                  checked={column.visible}
                                  onCheckedChange={() => toggleColumnVisibility(column.key)}
                                />
                                <div 
                                  className="w-2 h-2 rounded-sm flex-shrink-0" 
                                  style={{ backgroundColor: column.color }}
                                />
                                <span className="text-xs font-medium truncate" title={column.name}>
                                  {column.name}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex gap-1 mb-1">
                              <Button
                                size="sm"
                                variant={column.yAxisId === 'left' ? 'default' : 'outline'}
                                onClick={() => setColumnYAxis(column.key, 'left')}
                                className="text-xs h-5 px-1 flex-1"
                              >
                                L
                              </Button>
                              <Button
                                size="sm"
                                variant={column.yAxisId === 'right' ? 'default' : 'outline'}
                                onClick={() => setColumnYAxis(column.key, 'right')}
                                className="text-xs h-5 px-1 flex-1"
                              >
                                R
                              </Button>
                            </div>
                            
                            {stats && column.visible && (
                              <div className="text-xs text-muted-foreground">
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <span>↓{stats.min.toFixed(1)}</span>
                                  <span>↑{stats.max.toFixed(1)}</span>
                                  <span>Avg: {stats.mean.toFixed(1)}</span>
                                  <span>Med: {stats.median.toFixed(1)}</span>
                                </div>
                              </div>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
      </div>
    </div>
  )
}