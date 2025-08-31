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
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useAuth } from "@/hooks/use-auth"
import type { License } from "@/lib/api"
import { FileText, Filter, ChevronDown, ChevronRight, Eye, EyeOff, AlertTriangle } from "lucide-react"

const statusColors: Record<string, string> = {
  issued: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending_generation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  awaiting_hardware: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", 
  required_update: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const statusLabels: Record<string, string> = {
  awaiting_hardware: "Awaiting Hardware Info",
  pending_generation: "Pending Generation Pipeline", 
  issued: "Issued",
  required_update: "Update Is Required",
  failed: "Failed",
  expired: "Expired"
}

export default function LicensesPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState<string>("")
  const [ordering, setOrdering] = useState<string>("-created")
  const [expandedLicenses, setExpandedLicenses] = useState<Set<string>>(new Set())
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const {
    data: licenses,
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
  } = usePaginatedList<License>("/licenses/", {
    initialParams: {
      status: statusFilter === "all" ? "" : statusFilter,
      search: search,
      ordering: ordering,
    }
  })

  // Update params when filters change (with debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({
        status: statusFilter === "all" ? "" : statusFilter,
        search: search,
        ordering: ordering,
      })
    }, 300) // Debounce for 300ms
    return () => clearTimeout(timer)
  }, [statusFilter, search, ordering, updateParams])

  const toggleExpansion = (licenseUuid: string) => {
    const newExpanded = new Set(expandedLicenses)
    if (newExpanded.has(licenseUuid)) {
      newExpanded.delete(licenseUuid)
    } else {
      newExpanded.add(licenseUuid)
    }
    setExpandedLicenses(newExpanded)
  }

  const toggleKeyVisibility = (licenseUuid: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(licenseUuid)) {
      newVisible.delete(licenseUuid)
    } else {
      newVisible.add(licenseUuid)
    }
    setVisibleKeys(newVisible)
  }

  const isFeatureExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isFeatureExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false
    const expiryDate = new Date(expiresAt)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expiryDate < thirtyDaysFromNow && expiryDate > new Date()
  }

  const getEnabledFeaturesCount = (license: License) => {
    return Object.values(license.features).filter(feature => feature.enabled).length
  }

  const handleResetFilters = () => {
    setStatusFilter("all")
    setSearch("")
    setOrdering("-created")
  }

  const handleRowClick = (license: License) => {
    router.push(`/licenses/${license.uuid}`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 ml-6">
        <div>
          <h1 className="text-3xl font-bold">Licenses</h1>
          <p className="text-muted-foreground">Manage your software licenses</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
          <CardDescription>Search and filter your software licenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by VIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="pending_generation">Pending Generation</SelectItem>
                  <SelectItem value="awaiting_hardware">Awaiting Hardware</SelectItem>
                  <SelectItem value="required_update">Update Required</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ordering">Sort by</Label>
              <Select value={ordering} onValueChange={setOrdering}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created">Newest first</SelectItem>
                  <SelectItem value="created">Oldest first</SelectItem>
                  <SelectItem value="-modified">Recently modified</SelectItem>
                  <SelectItem value="modified">Least recently modified</SelectItem>
                  <SelectItem value="status">Status A-Z</SelectItem>
                  <SelectItem value="-status">Status Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={handleResetFilters} variant="outline">
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading licenses: {error?.message || 'Unknown error'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Software Licenses ({licenses.length})
          </CardTitle>
          <CardDescription>Click on a license to view details, or expand to see features</CardDescription>
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
          ) : licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No licenses found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {licenses.map((license) => {
                const isExpanded = expandedLicenses.has(license.uuid)
                
                return (
                  <div key={license.uuid} className="border rounded-lg overflow-hidden">
                    <div 
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(license)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 flex-1">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Vehicle</p>
                            <p className="text-sm font-mono text-muted-foreground">{license.vehicle}</p>
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-sm font-medium">License Key</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-mono text-muted-foreground break-all">
                                {visibleKeys.has(license.uuid) ? license.uuid : `${license.uuid.slice(0, 8)}...`}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleKeyVisibility(license.uuid)
                                }}
                                className="h-6 w-6 p-0 shrink-0"
                              >
                                {visibleKeys.has(license.uuid) ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Status</p>
                            <Badge 
                              variant="secondary" 
                              className={`${statusColors[license.status] || ""} text-xs whitespace-nowrap`}
                            >
                              {statusLabels[license.status] || license.status}
                            </Badge>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Features</p>
                            <p className="text-sm text-muted-foreground">
                              {getEnabledFeaturesCount(license)} of {Object.keys(license.features).length} enabled
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Created</p>
                            <p className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(license.created).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {license.expiration_date && (
                            <div className="text-right">
                              <p className="text-sm font-medium">Expires</p>
                              <div className="flex items-center gap-1">
                                {isFeatureExpired(license.expiration_date) && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                {!isFeatureExpired(license.expiration_date) && 
                                 isFeatureExpiringSoon(license.expiration_date) && (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                                <p className="text-sm text-muted-foreground">
                                  {new Date(license.expiration_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {Object.keys(license.features).length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpansion(license.uuid)
                              }}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              Features
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Features Section */}
                    {Object.keys(license.features).length > 0 && (
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="border-t p-4 bg-muted/20">
                            <h4 className="text-sm font-medium mb-3">Features</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(license.features).map(([featureName, feature]) => (
                                <div key={featureName} className="space-y-2 p-3 border rounded-md bg-background">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium uppercase">
                                      {featureName}
                                    </p>
                                    <Badge 
                                      variant={feature.enabled ? "default" : "secondary"}
                                      className={feature.enabled ? "bg-green-100 text-green-800" : ""}
                                    >
                                      {feature.enabled ? "Enabled" : "Disabled"}
                                    </Badge>
                                  </div>
                                  
                                  {feature.enabled && feature.expires_at && (
                                    <div className="flex items-center gap-1 text-sm">
                                      {isFeatureExpired(feature.expires_at) && (
                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                      )}
                                      {!isFeatureExpired(feature.expires_at) && 
                                       isFeatureExpiringSoon(feature.expires_at) && (
                                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                      )}
                                      <span className="text-muted-foreground">
                                        Expires: {new Date(feature.expires_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {feature.enabled && !feature.expires_at && (
                                    <p className="text-sm text-muted-foreground">No expiration</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )
              })}
              
              {/* Pagination */}
              {!loading && licenses.length > 0 && (
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