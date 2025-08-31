"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { SVT } from "@/lib/api"
import { formatSvkString, svtTypeLabels } from "@/lib/ecu-utils"

interface SvtDisplayProps {
  svts: SVT[]
  ecuSerial: string
  showCounts?: boolean
  expandable?: boolean
  className?: string
}

export function SvtDisplay({ 
  svts, 
  ecuSerial, 
  showCounts = true, 
  expandable = true,
  className = ""
}: SvtDisplayProps) {
  const [expandedSvts, setExpandedSvts] = useState<Set<string>>(new Set())

  const toggleSvtExpansion = (svtKey: string) => {
    if (!expandable) return
    
    const newExpanded = new Set(expandedSvts)
    if (newExpanded.has(svtKey)) {
      newExpanded.delete(svtKey)
    } else {
      newExpanded.add(svtKey)
    }
    setExpandedSvts(newExpanded)
  }

  if (!svts || svts.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        No SVT data found
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {svts.map((svt, svtIndex) => {
        const svtKey = `${ecuSerial}-${svt.type}-${svtIndex}`
        const isSvtExpanded = expandedSvts.has(svtKey)
        const svkCount = svt.svks?.length || 0
        
        return (
          <div key={svtKey} className="border rounded-md p-3 bg-background">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {svtTypeLabels[svt.type] || svt.type}
                </Badge>
                {showCounts && (
                  <span className="text-sm text-muted-foreground">
                    ({svkCount} SVK{svkCount !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
              
              {expandable && svkCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSvtExpansion(svtKey)}
                  className="h-auto p-1"
                >
                  {isSvtExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            
            {expandable ? (
              <Collapsible open={isSvtExpanded}>
                <CollapsibleContent className="mt-2">
                  <div className="ml-2 space-y-1">
                    {svt.svks?.map((svk, svkIndex) => (
                      <div key={svkIndex} className="text-sm font-mono text-muted-foreground border-l-2 border-muted pl-3">
                        {formatSvkString(svk)}
                      </div>
                    )) || (
                      <div className="text-sm text-muted-foreground">No SVKs found</div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              // Non-expandable mode - show all SVKs directly
              <div className="mt-2 ml-2 space-y-1">
                {svt.svks?.map((svk, svkIndex) => (
                  <div key={svkIndex} className="text-sm font-mono text-muted-foreground border-l-2 border-muted pl-3">
                    {formatSvkString(svk)}
                  </div>
                )) || (
                  <div className="text-sm text-muted-foreground">No SVKs found</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Summary component for showing SVT counts in a compact format
interface SvtSummaryProps {
  svts: SVT[]
  className?: string
}

export function SvtSummary({ svts, className = "" }: SvtSummaryProps) {
  if (!svts || svts.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        No SVT data
      </div>
    )
  }

  // Group by type and count SVKs
  const typeCounts: Record<string, number> = {}
  let totalSvks = 0

  svts.forEach(svt => {
    const svkCount = svt.svks?.length || 0
    typeCounts[svt.type] = (typeCounts[svt.type] || 0) + svkCount
    totalSvks += svkCount
  })

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-sm font-medium">{totalSvks} SVKs:</span>
      {Object.entries(typeCounts).map(([type, count]) => (
        <Badge key={type} variant="outline" className="text-xs">
          {svtTypeLabels[type] || type} ({count})
        </Badge>
      ))}
    </div>
  )
}