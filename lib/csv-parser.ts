/**
 * CSV Parser utility for automotive log files
 * Parses CSV data from engine/ECU logs for chart visualization
 */

export interface ChartDataPoint {
  time: number
  [key: string]: number | string | null
}

export interface ChartColumn {
  key: string
  name: string
  unit?: string
  color?: string
  yAxis?: 'left' | 'right' | number
  visible?: boolean
}

export interface ParsedCsvData {
  columns: ChartColumn[]
  data: ChartDataPoint[]
  totalRows: number
  timeRange: {
    min: number
    max: number
  }
  sampleRate?: number
}

/**
 * Color palette for chart lines - muted Tailwind-based colors for better readability
 * Uses Tailwind CSS 400-500 series colors for softer, more professional appearance
 */
const CHART_COLORS = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#f87171', // red-400
  '#a78bfa', // violet-400
  '#fbbf24', // amber-400
  '#22d3ee', // cyan-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#818cf8', // indigo-400
  '#4ade80', // green-400
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#a855f7', // purple-500
  '#84cc16', // lime-500
  '#14b8a6', // teal-500
  '#d946ef', // fuchsia-500
  '#eab308', // yellow-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#6366f1', // indigo-500
  '#94a3b8', // slate-400
  '#6b7280', // gray-500
  '#71717a', // zinc-500
  '#c084fc', // purple-400
  '#fcd34d', // amber-300
  '#67e8f9', // cyan-300
  '#fdba74', // orange-300
  '#93c5fd', // blue-300
  '#86efac', // green-300
  '#fca5a5', // red-300
  '#c4b5fd', // violet-300
  '#fdba74', // orange-300
  '#bef264'  // lime-300
]

/**
 * Parse CSV content into structured data for chart visualization - optimized for performance
 */
export async function parseCsvData(csvContent: string): Promise<ParsedCsvData> {
  try {
    // Split into lines and remove empty lines - optimized
    const lines = csvContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row')
    }

    // For very large files, process in chunks to avoid blocking UI
    if (lines.length > 10000) {
      console.log(`Processing large CSV file with ${lines.length} rows...`)
    }

    // Parse header (first line) - handle semicolon or comma delimited
    const headerLine = lines[0]
    const delimiter = headerLine.includes(';') ? ';' : ','
    const headers = headerLine.split(delimiter).map(h => h.trim())

    // Validate that first column is 'time' or contains time-related data
    const timeColumn = headers[0].toLowerCase()
    if (!timeColumn.includes('time')) {
      console.warn('First column is not recognized as time data:', headers[0])
    }

    // Create column definitions - simple, no predefined configs
    // Track used keys to ensure uniqueness
    const usedKeys = new Set<string>()

    const columns: ChartColumn[] = headers.map((header, index) => {
      let key = header.toLowerCase().replace(/[^a-z0-9]/g, '_')

      // Ensure unique keys by appending index if duplicate
      let uniqueKey = key
      let counter = 1
      while (usedKeys.has(uniqueKey)) {
        uniqueKey = `${key}_${counter}`
        counter++
      }
      usedKeys.add(uniqueKey)

      return {
        key: uniqueKey,
        name: header,
        unit: '',
        color: CHART_COLORS[index % CHART_COLORS.length],
        yAxis: index === 0 ? 'left' : 'right', // First column (time) on left, rest on right by default
        visible: false // Start with all columns hidden, user will enable them
      }
    })

    // Parse data rows
    const data: ChartDataPoint[] = []
    const timeValues: number[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(delimiter).map(v => v.trim())
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}`)
        continue
      }

      const dataPoint: ChartDataPoint = { time: 0 }

      for (let j = 0; j < values.length; j++) {
        const key = columns[j].key
        const rawValue = values[j]

        // Parse numeric values
        const numericValue = parseFloat(rawValue)
        
        if (j === 0) {
          // First column is time
          if (!isNaN(numericValue)) {
            dataPoint.time = numericValue
            timeValues.push(numericValue)
          } else {
            console.warn(`Invalid time value in row ${i + 1}:`, rawValue)
            continue
          }
        } else {
          // Other columns are data
          dataPoint[key] = isNaN(numericValue) ? rawValue : numericValue
        }
      }

      if (dataPoint.time !== undefined) {
        data.push(dataPoint)
      }
    }

    if (data.length === 0) {
      throw new Error('No valid data rows found in CSV')
    }

    // Calculate time range and sample rate
    const timeRange = {
      min: Math.min(...timeValues),
      max: Math.max(...timeValues)
    }

    // Estimate sample rate (time between samples)
    let sampleRate: number | undefined
    if (timeValues.length > 1) {
      const timeDiffs = []
      for (let i = 1; i < timeValues.length && i < 100; i++) {
        timeDiffs.push(timeValues[i] - timeValues[i - 1])
      }
      sampleRate = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
    }

    return {
      columns,
      data,
      totalRows: data.length,
      timeRange,
      sampleRate
    }

  } catch (error) {
    console.error('CSV parsing error:', error)
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Filter data points within a time range
 */
export function filterDataByTimeRange(
  data: ChartDataPoint[],
  startTime: number,
  endTime: number
): ChartDataPoint[] {
  return data.filter(point => point.time >= startTime && point.time <= endTime)
}

/**
 * Downsample data for better performance with large datasets
 */
export function downsampleData(
  data: ChartDataPoint[],
  maxPoints: number = 1000
): ChartDataPoint[] {
  if (data.length <= maxPoints) {
    return data
  }

  const step = Math.floor(data.length / maxPoints)
  const downsampled: ChartDataPoint[] = []

  for (let i = 0; i < data.length; i += step) {
    downsampled.push(data[i])
  }

  return downsampled
}

