"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DataTable } from "@/components/data-table"
import { AddVehicleDialog } from "@/components/add-vehicle-dialog"
import { ProjectsTable } from "@/components/projects-table"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useAuth } from "@/hooks/use-auth"
import type { Vehicle } from "@/lib/api"
import { Filter, ChevronDown, ChevronRight, Car } from "lucide-react"

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ongoing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  finished: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export default function VehiclesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [paidOptionsFilter, setPaidOptionsFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("-created")
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set())

  const {
    data: vehicles,
    loading,
    error,
    refetch,
    updateParams,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    currentPage,
    totalPages,
  } = usePaginatedList<Vehicle>("/vehicles/", {
    initialParams: { expand: "projects", ordering: sortBy },
  })

  const paidOptionsOptions: MultiSelectOption[] = [
    { label: "EGS", value: "egs" },
    { label: "Swap", value: "swap" },
    { label: "EGS Swap", value: "egs_swap" },
  ]

  const sortOptions = [
    { label: "Created (Newest)", value: "-created" },
    { label: "Created (Oldest)", value: "created" },
    { label: "VIN (A-Z)", value: "vin" },
    { label: "VIN (Z-A)", value: "-vin" },
  ]

  const handleSearch = () => {
    const params: any = { expand: "projects", ordering: sortBy }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim()
    }
    updateParams(params)
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    const params: any = { expand: "projects", ordering: value }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim()
    }
    updateParams(params)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setPaidOptionsFilter([])
    setSortBy("-created")
    updateParams({ expand: "projects", ordering: "-created" })
  }

  const toggleVehicleExpansion = (vin: string) => {
    const newExpanded = new Set(expandedVehicles)
    if (newExpanded.has(vin)) {
      newExpanded.delete(vin)
    } else {
      newExpanded.add(vin)
    }
    setExpandedVehicles(newExpanded)
  }

  const getPaidOptions = (vehicle: Vehicle): string[] => {
    const options: string[] = []
    if (vehicle.egs_paid) options.push("EGS")
    if (vehicle.swap_paid) options.push("Swap")
    if (vehicle.egs_swap_paid) options.push("EGS Swap")
    return options
  }

  // Filter vehicles based on paid options filter
  const filteredVehicles = vehicles.filter(vehicle => {
    if (paidOptionsFilter.length === 0) return true
    const vehicleOptions = getPaidOptions(vehicle)
    return paidOptionsFilter.some(filter => {
      if (filter === "egs") return vehicle.egs_paid
      if (filter === "swap") return vehicle.swap_paid
      if (filter === "egs_swap") return vehicle.egs_swap_paid
      return false
    })
  })

  const columns = [
    {
      key: "vin" as keyof Vehicle,
      header: "VIN",
      render: (vin: string) => (
        <span className="font-mono text-sm whitespace-nowrap">
          {vin}
        </span>
      ),
    },
    // Show dealer column for customers, customer column for dealers
    ...(user?.profile_type === "customer" ? [{
      key: "dealer" as keyof Vehicle,
      header: "Dealer",
      render: (dealer: string) => dealer ? (
        <span className="text-sm truncate">{dealer}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    }] : []),
    ...(user?.profile_type === "dealer" ? [{
      key: "customer" as keyof Vehicle,
      header: "Customer",
      render: (customer: string) => customer ? (
        <span className="text-sm truncate">{customer}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    }] : []),
    {
      key: "paid_options" as keyof Vehicle,
      header: "Paid Options",
      render: (_, vehicle: Vehicle) => {
        const options = getPaidOptions(vehicle)
        return options.length > 0 ? (
          <div className="flex flex-col gap-1 max-w-[120px]">
            {options.map(option => (
              <Badge key={option} variant="outline" className="text-xs whitespace-nowrap">
                {option}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">None</span>
        )
      },
    },
    {
      key: "created" as keyof Vehicle,
      header: "Created",
      render: (created: string) => created ? (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(created).toLocaleDateString()}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      key: "projects_toggle" as keyof Vehicle,
      header: "Projects",
      render: (_, vehicle: Vehicle) => {
        const projectCount = vehicle.projects?.length || 0
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              toggleVehicleExpansion(vehicle.vin)
            }}
            className="h-auto p-1"
          >
            {expandedVehicles.has(vehicle.vin) ? (
              <ChevronDown className="h-4 w-4 mr-1" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1" />
            )}
            {projectCount}
          </Button>
        )
      },
    },
  ]

  const handleRowClick = (vehicle: Vehicle) => {
    router.push(`/vehicles/${vehicle.vin}`)
  }

  const hasActiveFilters = searchQuery.trim() !== "" || paidOptionsFilter.length > 0 || sortBy !== "-created"

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-4 flex-wrap ml-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">Vehicles</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your vehicle inventory</p>
        </div>
        <div className="shrink-0">
          <AddVehicleDialog onVehicleAdded={refetch} />
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
          <CardDescription>Search and filter vehicles by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-1 space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch()
                    }
                  }}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Paid Options Filter */}
            <div className="space-y-2">
              <Label>Paid Options</Label>
              <MultiSelect
                options={paidOptionsOptions}
                selected={paidOptionsFilter}
                onChange={setPaidOptionsFilter}
                placeholder="Filter by paid options..."
                className="w-full"
              />
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters}>
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading vehicles: {error?.message || 'Unknown error'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-6 w-6" />
            All Vehicles ({filteredVehicles.length})
          </CardTitle>
          <CardDescription>Click on a vehicle to view details, or expand projects inline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {columns.map((column, index) => (
                      <th key={index} className="text-left p-3 font-medium text-sm">
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length} className="p-8 text-center">
                        <div className="animate-pulse">Loading vehicles...</div>
                      </td>
                    </tr>
                  ) : filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                        No vehicles found
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((vehicle) => {
                      const isExpanded = expandedVehicles.has(vehicle.vin)
                      
                      return (
                        <React.Fragment key={vehicle.vin}>
                          {/* Main vehicle row */}
                          <tr 
                            className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleRowClick(vehicle)}
                          >
                            {columns.map((column, colIndex) => (
                              <td key={colIndex} className="p-3">
                                {column.render ? column.render(vehicle[column.key], vehicle) : vehicle[column.key]}
                              </td>
                            ))}
                          </tr>
                          
                          {/* Expanded projects row */}
                          {isExpanded && vehicle.projects && vehicle.projects.length > 0 && (
                            <tr>
                              <td colSpan={columns.length} className="p-0">
                                <div className="bg-muted/20 border-l-4 border-primary/20">
                                  <div className="p-4">
                                    <div className="space-y-2">
                                      {vehicle.projects.map((project) => (
                                        <div 
                                          key={project.uuid}
                                          className="flex items-center justify-between p-3 bg-background border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                                          onClick={() => router.push(`/projects/${project.uuid}`)}
                                        >
                                          <div className="flex items-center gap-4">
                                            <span className="font-medium text-sm">{project.title}</span>
                                            <Badge 
                                              variant="secondary" 
                                              className={statusColors[project.status] || ""}
                                            >
                                              {project.status}
                                            </Badge>
                                          </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                              <span>{new Date(project.created).toLocaleDateString()}</span>

                                              {Number(project.unread_count) > 0 && (
                                                <Badge variant="destructive" className="text-xs">
                                                  {Number(project.unread_count)} unread
                                                </Badge>
                                              )}

                                              <span>Modified: {new Date(project.modified).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && filteredVehicles.length > 0 && (
              <div className="flex items-center justify-between px-2">
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
        </CardContent>
      </Card>
    </div>
  )
}
