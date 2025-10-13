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
 * Color palette for chart lines - highly contrasting colors for better differentiation
 * Colors are selected to be maximally distinct from each other
 */
const CHART_COLORS = [
  '#FF0000', // Bright Red
  '#0000FF', // Bright Blue
  '#00FF00', // Bright Green
  '#FF00FF', // Magenta
  '#FFFF00', // Yellow
  '#00FFFF', // Cyan
  '#FF8000', // Orange
  '#8000FF', // Purple
  '#00FF80', // Spring Green
  '#FF0080', // Rose
  '#0080FF', // Azure
  '#80FF00', // Chartreuse
  '#FF6B35', // Coral
  '#4ECDC4', // Turquoise
  '#FFD700', // Gold
  '#FF1493', // Deep Pink
  '#00CED1', // Dark Turquoise
  '#FF4500', // Orange Red
  '#9370DB', // Medium Purple
  '#32CD32', // Lime Green
  '#FF69B4', // Hot Pink
  '#1E90FF', // Dodger Blue
  '#FFB6C1', // Light Pink
  '#20B2AA', // Light Sea Green
  '#FF6347', // Tomato
  '#4169E1', // Royal Blue
  '#98FB98', // Pale Green
  '#DDA0DD', // Plum
  '#F0E68C', // Khaki
  '#87CEEB', // Sky Blue
  '#FA8072', // Salmon
  '#9932CC', // Dark Orchid
  '#7FFF00', // Chartreuse
  '#DC143C', // Crimson
  '#00BFFF', // Deep Sky Blue
  '#ADFF2F', // Green Yellow
  '#FF00FF', // Fuchsia
  '#00FA9A', // Medium Spring Green
  '#FF1493', // Deep Pink
  '#00CED1'  // Dark Turquoise
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

