"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { ListFilters } from "@/components/list-filters"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useAuth } from "@/hooks/use-auth"
import type { ECU } from "@/lib/api"
import { ChevronDown, ChevronRight, Cpu, ExternalLink } from "lucide-react"
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
  const [hasAssignedDealer, setHasAssignedDealer] = useState<string>("all")
  const [hasAssignedCustomer, setHasAssignedCustomer] = useState<string>("all")
  const [ecuTypeFilter, setEcuTypeFilter] = useState<string>("all")
  const [svtTypeFilter, setSvtTypeFilter] = useState<string[]>([])
  const [ordering, setOrdering] = useState<string>("-created")
  const [expandedEcus, setExpandedEcus] = useState<Set<string>>(new Set())
  const [expandedSvts, setExpandedSvts] = useState<Set<string>>(new Set())

  // Build params conditionally based on user role
  const buildParams = () => {
    const params: Record<string, string> = {
      search: search,
      has_assigned_vehicle: hasAssignedVehicle === "all" ? "" : hasAssignedVehicle,
      type: ecuTypeFilter === "all" ? "" : ecuTypeFilter,
      svt_type: svtTypeFilter.join(","),
      ordering: ordering,
    }

    // Add role-specific filters
    if (user?.profile_type === "customer") {
      params.has_assigned_dealer = hasAssignedDealer === "all" ? "" : hasAssignedDealer
    } else if (user?.profile_type === "dealer") {
      params.has_assigned_customer = hasAssignedCustomer === "all" ? "" : hasAssignedCustomer
    }

    return params
  }

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
    initialParams: buildParams()
  })

  // Update params when filters change (with debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams(buildParams())
    }, 300) // Debounce for 300ms
    return () => clearTimeout(timer)
  }, [search, hasAssignedVehicle, hasAssignedDealer, hasAssignedCustomer, ecuTypeFilter, svtTypeFilter, ordering, user?.profile_type])

  // Handle immediate search on Enter key
  const handleSearchSubmit = () => {
    updateParams(buildParams())
  }

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
    setHasAssignedDealer("all")
    setHasAssignedCustomer("all")
    setEcuTypeFilter("all")
    setSvtTypeFilter([])
    setOrdering("-created")
  }

  const handleRowClick = (ecu: ECU) => {
    router.push(`/ecus/${ecu.serial}`)
  }

  const hasActiveFilters = search.trim() !== "" || hasAssignedVehicle !== "all" ||
                          hasAssignedDealer !== "all" || hasAssignedCustomer !== "all" ||
                          ecuTypeFilter !== "all" || svtTypeFilter.length > 0 || ordering !== "-created"

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6 ml-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">ECUs</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage ECU inventory and data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ListFilters
          searchValue={search}
          searchPlaceholder="Search VIN, serial, name..."
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          filterFields={[
            {
              id: "vehicleAssignment",
              label: "Vehicle Assignment",
              content: (
                <Select value={hasAssignedVehicle} onValueChange={setHasAssignedVehicle}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ECUs</SelectItem>
                    <SelectItem value="true">Assigned to Vehicle</SelectItem>
                    <SelectItem value="false">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
            // Show Dealer Assignment filter for customers
            ...(user?.profile_type === "customer" ? [{
              id: "dealerAssignment",
              label: "Dealer Assignment",
              content: (
                <Select value={hasAssignedDealer} onValueChange={setHasAssignedDealer}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ECUs</SelectItem>
                    <SelectItem value="true">Assigned to Dealer</SelectItem>
                    <SelectItem value="false">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              ),
            }] : []),
            // Show Customer Assignment filter for dealers
            ...(user?.profile_type === "dealer" ? [{
              id: "customerAssignment",
              label: "Customer Assignment",
              content: (
                <Select value={hasAssignedCustomer} onValueChange={setHasAssignedCustomer}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ECUs</SelectItem>
                    <SelectItem value="true">Assigned to Customer</SelectItem>
                    <SelectItem value="false">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              ),
            }] : []),
            {
              id: "ecuType",
              label: "ECU Type",
              content: (
                <Select value={ecuTypeFilter} onValueChange={setEcuTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="1769">1769</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
            {
              id: "svtTypes",
              label: "SVT Types",
              content: (
                <MultiSelect
                  options={svtTypeOptions}
                  selected={svtTypeFilter}
                  onChange={setSvtTypeFilter}
                  placeholder="Filter by SVT types..."
                  className="w-full h-9"
                />
              ),
            },
          ]}
          sortField={
            <Select value={ordering} onValueChange={setOrdering}>
              <SelectTrigger className="h-9 w-[180px]">
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
          }
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={[
            search.trim() !== "",
            hasAssignedVehicle !== "all",
            hasAssignedDealer !== "all",
            hasAssignedCustomer !== "all",
            ecuTypeFilter !== "all",
            svtTypeFilter.length > 0
          ].filter(Boolean).length}
        />
      </div>

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
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 flex-1 w-full lg:w-auto">
                          <div className="min-w-0 col-span-2 sm:col-span-1">
                            <p className="text-sm font-medium">VIN</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{ecu.vehicle}</p>
                              {ecu.vehicle && (
                                <Button variant="ghost" size="sm" asChild className="shrink-0">
                                  <Link href={`/vehicles/${ecu.vehicle}`}>
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-medium">Serial</p>
                            <p className="text-sm font-mono text-muted-foreground truncate">{ecu.serial}</p>
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

                          <div className="min-w-0">
                            <p className="text-sm font-medium">Name</p>
                            <p className="text-sm text-muted-foreground truncate">{ecu.name}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium">Type</p>
                            <Badge variant="secondary" className={`${ecuTypeInfo.color} text-xs`}>
                              {ecuTypeInfo.label}
                            </Badge>
                          </div>

                          <div className="hidden md:block">
                            <p className="text-sm font-medium">Address</p>
                            <p className="text-sm font-mono text-muted-foreground">{formatAddress(ecu.address)}</p>
                          </div>

                          <div className="hidden lg:block">
                            <p className="text-sm font-medium">Mfg</p>
                            <p className="text-sm font-mono text-muted-foreground">{formatManufacturingDate(ecu.man_date)}</p>
                          </div>

                          <div className="hidden xl:block">
                            <p className="text-sm font-medium">BMW Name</p>
                            <p className="text-sm font-mono text-muted-foreground truncate">{ecu.name_BMW}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ecu.svts && ecu.svts.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleEcuExpansion(ecu.serial)
                              }}
                              className="shrink-0"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <span className="ml-1 hidden sm:inline">
                                SVT/SVK ({Object.values(svtCounts).reduce((a, b) => a + b, 0)})
                              </span>
                              <span className="ml-1 sm:hidden">
                                ({Object.values(svtCounts).reduce((a, b) => a + b, 0)})
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