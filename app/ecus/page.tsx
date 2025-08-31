"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useAuth } from "@/hooks/use-auth"
import type { ECU } from "@/lib/api"
import { Filter, ChevronDown, ChevronRight, Cpu, ExternalLink } from "lucide-react"
import Link from "next/link"
import { 
  formatManufacturingDate, 
  formatAddress, 
  getEcuTypeInfo, 
  getSvtCounts,
  formatSvkString,
  svtTypeLabels
} from "@/lib/ecu-utils"

export default function ECUsPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Filter states
  const [search, setSearch] = useState<string>("")
  const [hasAssignedVehicle, setHasAssignedVehicle] = useState<string>("all")
  const [ecuTypeFilter, setEcuTypeFilter] = useState<string>("all")
  const [svtTypeFilter, setSvtTypeFilter] = useState<string[]>([])
  const [ordering, setOrdering] = useState<string>("-created")
  const [expandedEcus, setExpandedEcus] = useState<Set<string>>(new Set())
  const [expandedSvts, setExpandedSvts] = useState<Set<string>>(new Set())

  const {
    data: ecus,
    loading,
    error,
    refetch,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    currentPage,
    totalPages,
    updateParams,
  } = usePaginatedList<ECU>("/ecus/", {
    initialParams: {
      search: search,
      has_assigned_vehicle: hasAssignedVehicle === "all" ? "" : hasAssignedVehicle,
      ecu_type: ecuTypeFilter === "all" ? "" : ecuTypeFilter,
      svt_type: svtTypeFilter.join(","),
      ordering: ordering,
    }
  })

  // Update params when filters change (with debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({
        search: search,
        has_assigned_vehicle: hasAssignedVehicle === "all" ? "" : hasAssignedVehicle,
        ecu_type: ecuTypeFilter === "all" ? "" : ecuTypeFilter,
        svt_type: svtTypeFilter.join(","),
        ordering: ordering,
      })
    }, 300) // Debounce for 300ms
    return () => clearTimeout(timer)
  }, [search, hasAssignedVehicle, ecuTypeFilter, svtTypeFilter, ordering, updateParams])

  const svtTypeOptions: MultiSelectOption[] = [
    { label: "Main", value: "main" },
    { label: "Actual", value: "actual" },
    { label: "Backup", value: "backup" },
  ]

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

  const handleResetFilters = () => {
    setSearch("")
    setHasAssignedVehicle("all")
    setEcuTypeFilter("all")
    setSvtTypeFilter([])
    setOrdering("-created")
  }

  const handleRowClick = (ecu: ECU) => {
    router.push(`/ecus/${ecu.serial}`)
  }

  const hasActiveFilters = search.trim() !== "" || hasAssignedVehicle !== "all" || 
                          ecuTypeFilter !== "all" || svtTypeFilter.length > 0 || ordering !== "-created"

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 ml-6">
        <div>
          <h1 className="text-3xl font-bold">ECUs</h1>
          <p className="text-muted-foreground">Manage ECU inventory and data</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
          <CardDescription>Search and filter ECUs by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search VIN, serial, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            {/* Has Assigned Vehicle */}
            <div className="space-y-2">
              <Label htmlFor="hasVehicle">Vehicle Assignment</Label>
              <Select value={hasAssignedVehicle} onValueChange={setHasAssignedVehicle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ECUs</SelectItem>
                  <SelectItem value="true">Assigned to Vehicle</SelectItem>
                  <SelectItem value="false">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* ECU Type */}
            <div className="space-y-2">
              <Label htmlFor="ecuType">ECU Type</Label>
              <Select value={ecuTypeFilter} onValueChange={setEcuTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="1769">1769</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* SVT Type */}
            <div className="space-y-2">
              <Label>SVT Types</Label>
              <MultiSelect
                options={svtTypeOptions}
                selected={svtTypeFilter}
                onChange={setSvtTypeFilter}
                placeholder="Filter by SVT types..."
                className="w-full"
              />
            </div>
            
            {/* Ordering */}
            <div className="space-y-2">
              <Label htmlFor="ordering">Sort By</Label>
              <Select value={ordering} onValueChange={setOrdering}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created">Newest first</SelectItem>
                  <SelectItem value="created">Oldest first</SelectItem>
                  <SelectItem value="-modified">Recently modified</SelectItem>
                  <SelectItem value="modified">Least recently modified</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="-name">Name Z-A</SelectItem>
                  <SelectItem value="serial">Serial A-Z</SelectItem>
                  <SelectItem value="-serial">Serial Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={handleResetFilters} disabled={!hasActiveFilters}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading ECUs: {error?.message || 'Unknown error'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-6 w-6" />
            ECUs ({ecus.length})
          </CardTitle>
          <CardDescription>Click on an ECU to view details, or expand to see SVT/SVK data</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : ecus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No ECUs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ecus.map((ecu) => {
                const isExpanded = expandedEcus.has(ecu.serial)
                const ecuTypeInfo = getEcuTypeInfo(ecu.type)
                const svtCounts = getSvtCounts(ecu)
                
                return (
                  <div key={ecu.serial} className="border rounded-lg overflow-hidden">
                    <div 
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(ecu)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 flex-1">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">VIN</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono text-muted-foreground break-all">{ecu.vehicle}</p>
                              {ecu.vehicle && (
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/vehicles/${ecu.vehicle}`}>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Role-based dealer/customer column */}
                          {user?.profile_type === "customer" ? (
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Dealer</p>
                              <p className="text-sm text-muted-foreground truncate">{ecu.dealer}</p>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Customer</p>
                              <p className="text-sm text-muted-foreground truncate">{ecu.customer}</p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-sm font-medium">Name</p>
                            <p className="text-sm text-muted-foreground">{ecu.name}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Type</p>
                            <Badge variant="secondary" className={`${ecuTypeInfo.color} text-xs`}>
                              {ecuTypeInfo.label}
                            </Badge>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Serial</p>
                            <p className="text-sm font-mono text-muted-foreground">{ecu.serial}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Address</p>
                            <p className="text-sm font-mono text-muted-foreground">{formatAddress(ecu.address)}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium">Mfg</p>
                            <p className="text-sm font-mono text-muted-foreground">{formatManufacturingDate(ecu.man_date)}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium">BMW Name</p>
                            <p className="text-sm font-mono text-muted-foreground">{ecu.name_BMW}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 ml-4">
                          
                          {ecu.svts && ecu.svts.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleEcuExpansion(ecu.serial)
                              }}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="ml-1">
                                SVT/SVK ({Object.values(svtCounts).reduce((a, b) => a + b, 0)})
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SVT/SVK Expansion */}
                    {ecu.svts && ecu.svts.length > 0 && (
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="border-t p-4 bg-muted/20">
                            <div className="space-y-3">
                              {ecu.svts.map((svt, svtIndex) => {
                                const svtKey = `${ecu.serial}-${svt.type}-${svtIndex}`
                                const isSvtExpanded = expandedSvts.has(svtKey)
                                
                                return (
                                  <div key={svtKey} className="border rounded-md p-3 bg-background">
                                    <Collapsible open={isSvtExpanded}>
                                      <CollapsibleTrigger 
                                        onClick={() => toggleSvtExpansion(svtKey)}
                                        className="flex items-center gap-2 text-sm hover:text-primary w-full justify-start"
                                      >
                                        {isSvtExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        <Badge variant="outline" className="text-xs">
                                          {svtTypeLabels[svt.type] || svt.type}
                                        </Badge>
                                        <span className="text-muted-foreground">({svt.svks?.length || 0} SVKs)</span>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="mt-2">
                                        <div className="ml-6 space-y-1">
                                          {svt.svks?.map((svk, svkIndex) => (
                                            <div key={svkIndex} className="text-sm font-mono text-muted-foreground">
                                              {formatSvkString(svk)}
                                            </div>
                                          )) || (
                                            <div className="text-sm text-muted-foreground">No SVKs found</div>
                                          )}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )
              })}
              
              {/* Pagination */}
              {!loading && ecus.length > 0 && (
                <div className="flex items-center justify-between px-2 pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPage}
                      disabled={!hasPrev}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={!hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}