import type { SVK, ECU } from "./api"

// SVK type mapping (extracted from ecu-panel.tsx)
export const svkTypeMapping: Record<number, string> = {
  1: "HWEL",
  2: "HWAP", 
  5: "CAFD",
  6: "BTLD",
  8: "SWFL",
  13: "SWFK"
}

// Format SVK string (extracted from ecu-panel.tsx)
export const formatSvkString = (svk: SVK): string => {
  const typeString = svkTypeMapping[Number(svk.type)] || svk.type
  return `${typeString} ${svk.id}_${svk.main_version}_${svk.sub_version}_${svk.patch_version}`
}

// Format manufacturing date from YYMMDD to readable format
export const formatManufacturingDate = (manDate: string): string => {
  if (!manDate || manDate.length !== 6) {
    return manDate || "Unknown"
  }
  
  try {
    const year = parseInt(manDate.substring(0, 2))
    const month = parseInt(manDate.substring(2, 4))
    const day = parseInt(manDate.substring(4, 6))
    
    // Convert YY to YYYY (assume 20xx for years 00-99)
    const fullYear = 2000 + year
    
    const date = new Date(fullYear, month - 1, day)
    return date.toLocaleDateString()
  } catch {
    return manDate
  }
}

// ECU type colors and labels
export const ecuTypeColors: Record<string, string> = {
  "original": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "1769": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export const ecuTypeLabels: Record<string, string> = {
  "original": "Original",
  "1769": "1769"
}

// SVT type labels  
export const svtTypeLabels: Record<string, string> = {
  "main": "Main",
  "actual": "Actual", 
  "backup": "Backup"
}

// Get ECU type display info
export const getEcuTypeInfo = (type: string) => ({
  label: ecuTypeLabels[type] || type,
  color: ecuTypeColors[type] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
})

// Format address as hex
export const formatAddress = (address: number): string => {
  return `0x${address.toString(16).toUpperCase()}`
}

// Get SVT counts by type
export const getSvtCounts = (ecu: ECU): Record<string, number> => {
  const counts: Record<string, number> = {
    main: 0,
    actual: 0, 
    backup: 0
  }
  
  ecu.svts?.forEach(svt => {
    if (counts.hasOwnProperty(svt.type)) {
      counts[svt.type] += 1
    }
  })
  
  return counts
}