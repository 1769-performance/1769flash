"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Cpu, FileText, BarChart3, Download, Upload, Loader2 } from "lucide-react"
import { type ECU, type SVT, type SVK, type File, type Log, getJson } from "@/lib/api"
import { FileUploadDialog } from "@/components/file-upload-dialog"

interface EcuPanelProps {
  ecus: ECU[]
  selectedEcuSerial?: string | null
  onEcuClick: (serial: string) => void
  isDealer?: boolean
  projectUuid?: string
  onFileUpload?: (ecuSerial: string) => void
  onLogVisualize?: (log: Log) => void
  onFileUploaded?: () => void
}

export function EcuPanel({ 
  ecus, 
  selectedEcuSerial, 
  onEcuClick,
  isDealer = false,
  projectUuid,
  onFileUpload,
  onLogVisualize,
  onFileUploaded
}: EcuPanelProps) {
  const [expandedEcus, setExpandedEcus] = useState<Set<string>>(new Set())
  const [expandedSvts, setExpandedSvts] = useState<Set<string>>(new Set())
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [ecuFiles, setEcuFiles] = useState<Record<string, File[]>>({})
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})

  // Fetch files when ECU is selected
  useEffect(() => {
    const fetchEcuFiles = async (ecuSerial: string) => {
      if (ecuFiles[ecuSerial] || loadingFiles.has(ecuSerial)) {
        return // Already loaded or loading
      }

      setLoadingFiles(prev => new Set(prev).add(ecuSerial))
      setFileErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[ecuSerial]
        return newErrors
      })

      try {
        const response = await getJson<any>(`/ecus/${ecuSerial}/files/`)
        
        // Handle paginated response structure
        let files: File[] = []
        if (response && Array.isArray(response.results)) {
          // Paginated response with results array
          files = response.results
        } else if (Array.isArray(response)) {
          // Direct array of files
          files = response
        }
        
        setEcuFiles(prev => ({
          ...prev,
          [ecuSerial]: files
        }))
      } catch (error) {
        // Handle 404 and other errors gracefully
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            // Set empty array for 404 - ECU exists but has no files
            setEcuFiles(prev => ({
              ...prev,
              [ecuSerial]: []
            }))
          } else {
            setFileErrors(prev => ({
              ...prev,
              [ecuSerial]: error.message
            }))
          }
        } else {
          setFileErrors(prev => ({
            ...prev,
            [ecuSerial]: "Failed to load files"
          }))
        }
      } finally {
        setLoadingFiles(prev => {
          const newLoading = new Set(prev)
          newLoading.delete(ecuSerial)
          return newLoading
        })
      }
    }

    if (selectedEcuSerial && !ecuFiles[selectedEcuSerial]) {
      fetchEcuFiles(selectedEcuSerial)
    }
  }, [selectedEcuSerial]) // Removed ecuFiles and loadingFiles dependencies to prevent infinite loops

  const toggleEcuExpansion = (ecuSerial: string) => {
    const newExpanded = new Set(expandedEcus)
    if (newExpanded.has(ecuSerial)) {
      newExpanded.delete(ecuSerial)
    } else {
      newExpanded.add(ecuSerial)
    }
    setExpandedEcus(newExpanded)
  }

  const toggleSvtExpansion = (svtKey: string) => {
    const newExpanded = new Set(expandedSvts)
    if (newExpanded.has(svtKey)) {
      newExpanded.delete(svtKey)
    } else {
      newExpanded.add(svtKey)
    }
    setExpandedSvts(newExpanded)
  }

  const toggleFileExpansion = (fileUuid: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(fileUuid)) {
      newExpanded.delete(fileUuid)
    } else {
      newExpanded.add(fileUuid)
    }
    setExpandedFiles(newExpanded)
  }

  const svkTypeMapping: Record<number, string> = {
    1: "HWEL",
    2: "HWAP", 
    5: "CAFD",
    6: "BTLD",
    8: "SWFL",
    13: "SWFK"
  }

  const formatSvkString = (svk: SVK): string => {
    const typeString = svkTypeMapping[Number(svk.type)] || svk.type
    return `${typeString} ${svk.id}_${svk.main_version}_${svk.sub_version}_${svk.patch_version}`
  }

  const handleEcuClick = (ecuSerial: string) => {
    onEcuClick(ecuSerial)
  }

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (ecus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            ECUs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No ECUs found for this project</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          ECUs ({ecus.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ecus.map((ecu) => {
          const isExpanded = expandedEcus.has(ecu.serial)
          const isSelected = selectedEcuSerial === ecu.serial

          return (
            <div key={ecu.serial} className="border rounded-lg p-4 space-y-3">
              {/* ECU Header - Clickable */}
              <div 
                className={`cursor-pointer select-none ${isSelected ? 'bg-muted' : ''} p-2 rounded-md`}
                onClick={() => handleEcuClick(ecu.serial)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ecu.name}</span>
                      <Badge variant={ecu.type === "1769" ? "default" : "secondary"}>
                        {ecu.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-x-4">
                      <span>Serial: {ecu.serial}</span>
                      <span>Address: 0x{ecu.address.toString(16).toUpperCase()}</span>
                      {ecu.man_date && <span>Mfg: {ecu.man_date}</span>}
                    </div>
                  </div>
                  
                  {/* SVT/SVK Toggle Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleEcuExpansion(ecu.serial)
                    }}
                    className="ml-2 shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="hidden sm:inline">SVT/SVK</span>
                  </Button>
                </div>
              </div>

              {/* SVT/SVK Collapsible Content */}
              <Collapsible open={isExpanded}>
                <CollapsibleContent className="space-y-2">
                  {ecu.svts.length > 0 ? (
                    ecu.svts.map((svt, svtIndex) => {
                      const svtKey = `${ecu.serial}-${svt.type}-${svtIndex}`
                      const isSvtExpanded = expandedSvts.has(svtKey)
                      
                      return (
                        <div key={svtKey} className="ml-4 border-l-2 border-muted pl-3">
                          <Collapsible open={isSvtExpanded}>
                            <CollapsibleTrigger 
                              onClick={() => toggleSvtExpansion(svtKey)}
                              className="flex items-center gap-2 text-sm hover:text-primary"
                            >
                              {isSvtExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <Badge variant="outline">{svt.type}</Badge>
                              <span className="text-muted-foreground">({svt.svks.length} SVKs)</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-1">
                              {svt.svks.map((svk, svkIndex) => (
                                <div key={svkIndex} className="ml-6 text-sm font-mono text-muted-foreground">
                                  {formatSvkString(svk)}
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      )
                    })
                  ) : (
                    <p className="ml-4 text-sm text-muted-foreground">No SVTs found</p>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Files & Logs Panel - Shown when ECU is selected */}
              {isSelected && (
                <div className="border-t pt-3 mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-sm font-medium flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">Files & Logs</span>
                      {loadingFiles.has(ecu.serial) && (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      )}
                    </h4>
                    {isDealer && onFileUploaded && (
                      <FileUploadDialog
                        ecuSerial={ecu.serial}
                        onFileUploaded={() => {
                          onFileUploaded?.()
                          // Clear cached files to trigger refresh
                          setEcuFiles(prev => {
                            const newFiles = { ...prev }
                            delete newFiles[ecu.serial]
                            return newFiles
                          })
                        }}
                      />
                    )}
                  </div>

                  {fileErrors[ecu.serial] ? (
                    <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-md">
                      Failed to load files: {fileErrors[ecu.serial]}
                    </div>
                  ) : ecuFiles[ecu.serial] && ecuFiles[ecu.serial].length > 0 ? (
                    <div className="space-y-2">
                      {ecuFiles[ecu.serial]
                        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
                        .map((file) => {
                          const isFileExpanded = expandedFiles.has(file.uuid)
                          
                          return (
                            <div key={file.uuid} className="border border-muted rounded-md p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="font-medium text-sm break-all min-w-0">{file.name}</span>
                                    <Badge
                                      variant="secondary"
                                      className={file.is_flashed
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                      }
                                    >
                                      {file.is_flashed ? "Flashed" : "Not Used"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                      {new Date(file.created).toLocaleString()}
                                    </span>
                                  </div>
                                  {file.comment && (
                                    <p className="text-xs text-muted-foreground ml-6 break-words">{file.comment}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {isDealer && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDownload(file.url, file.name)}
                                      title="Download file"
                                      className="shrink-0"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {file.logs && file.logs.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => toggleFileExpansion(file.uuid)}
                                      className="shrink-0"
                                    >
                                      {isFileExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <span className="hidden sm:inline">Logs ({file.logs.length})</span>
                                      <span className="sm:hidden">({file.logs.length})</span>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Logs Section */}
                              {file.logs && file.logs.length > 0 && (
                                <Collapsible open={isFileExpanded}>
                                  <CollapsibleContent className="mt-3 pt-3 border-t border-muted space-y-2">
                                    {file.logs.map((log) => (
                                      <div key={log.uuid} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded-md">
                                        <div className="space-y-1 flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-sm font-medium break-all min-w-0">{log.name}</span>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                              {new Date(log.created).toLocaleString()}
                                            </span>
                                          </div>
                                          {log.comment && (
                                            <p className="text-xs text-muted-foreground ml-6 break-words">{log.comment}</p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDownload(log.url, log.name)}
                                            title="Download log file"
                                            className="shrink-0"
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>

                                          {onLogVisualize && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => onLogVisualize(log)}
                                              title="Visualize log data"
                                              className="shrink-0"
                                            >
                                              <BarChart3 className="h-4 w-4 sm:mr-2" />
                                              <span className="hidden sm:inline">Visualize</span>
                                            </Button>
                                          )}

                                        </div>
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  ) : !loadingFiles.has(ecu.serial) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No files found for this ECU
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}