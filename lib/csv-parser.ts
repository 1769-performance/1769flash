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
 * Predefined automotive parameter configurations
 */
const AUTOMOTIVE_PARAMETERS: Record<string, Partial<ChartColumn>> = {
  'Engine RPM': {
    unit: 'rpm',
    color: '#ff6b35',
    yAxis: 'left'
  },
  'Accelerator Pedal': {
    unit: '%',
    color: '#4ecdc4',
    yAxis: 'right'
  },
  'Ignition Angle Actual': {
    unit: '°',
    color: '#45b7d1',
    yAxis: 'right'
  },
  'Ignition Angle Target': {
    unit: '°',
    color: '#96ceb4',
    yAxis: 'right'
  },
  'Load Actual': {
    unit: '%',
    color: '#feca57',
    yAxis: 'left'
  },
  'Load Target': {
    unit: '%',
    color: '#ff9ff3',
    yAxis: 'left'
  },
  'Lambda Actual Bank1': {
    unit: 'λ',
    color: '#54a0ff',
    yAxis: 'right'
  },
  'Lambda Actual Bank2': {
    unit: 'λ',
    color: '#5f27cd',
    yAxis: 'right'
  },
  'Lambda Target Bank1': {
    unit: 'λ',
    color: '#00d2d3',
    yAxis: 'right'
  },
  'Lambda Target Bank2': {
    unit: 'λ',
    color: '#ff9057',
    yAxis: 'right'
  },
  'Fuel Ethanol Content (RAM)': {
    unit: '%',
    color: '#6c5ce7',
    yAxis: 'right'
  },
  'ausgegebene Einspritzzeit': {
    unit: 'ms',
    color: '#a29bfe',
    yAxis: 'left'
  }
}

/**
 * Default colors for parameters not in the predefined list
 */
const DEFAULT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87d068', '#ffa39e', '#b5b5b5'
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

    // Create column definitions
    const columns: ChartColumn[] = headers.map((header, index) => {
      const key = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const predefined = AUTOMOTIVE_PARAMETERS[header]
      
      return {
        key,
        name: header,
        unit: predefined?.unit || '',
        color: predefined?.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        yAxis: predefined?.yAxis || (index === 0 ? 'left' : 'right'),
        visible: true,
        ...predefined
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

/**
 * Get statistics for a specific column
 */
export function getColumnStats(data: ChartDataPoint[], columnKey: string) {
  const values = data
    .map(point => point[columnKey])
    .filter(value => typeof value === 'number' && !isNaN(value)) as number[]

  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const median = sorted[Math.floor(sorted.length / 2)]

  return {
    min,
    max,
    mean,
    median,
    count: values.length
  }
}

/**
 * Detect automotive parameter patterns and suggest optimal Y-axis groupings
 */
export function suggestYAxisGroupings(columns: ChartColumn[]): Record<string, ChartColumn[]> {
  const groups: Record<string, ChartColumn[]> = {
    'RPM & Load': [],
    'Angles & Timing': [],
    'Lambda & Fuel': [],
    'Other': []
  }

  columns.forEach(column => {
    const name = column.name.toLowerCase()
    
    if (name.includes('rpm') || name.includes('load')) {
      groups['RPM & Load'].push(column)
    } else if (name.includes('angle') || name.includes('timing') || name.includes('ignition')) {
      groups['Angles & Timing'].push(column)
    } else if (name.includes('lambda') || name.includes('fuel') || name.includes('ethanol')) {
      groups['Lambda & Fuel'].push(column)
    } else {
      groups['Other'].push(column)
    }
  })

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key]
    }
  })

  return groups
}