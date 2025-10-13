"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ErrorAlert } from "@/components/ui/error-alert"
import { LoadingState } from "@/components/ui/loading-state"
import { ListFilters } from "@/components/list-filters"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import type { Customer, LicenseFeature } from "@/lib/api"
import { Users, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function CustomersPage() {
  const router = useRouter()
  
  // Filter states
  const [search, setSearch] = useState<string>("")
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())

  const {
    data: customers,
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
  } = usePaginatedList<Customer>("/accounts/customers/", {
    initialParams: {
      search: search,
    }
  })

  // Update params when search changes (with debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({
        search: search,
      })
    }, 300) // Debounce for 300ms
    return () => clearTimeout(timer)
  }, [search, updateParams])

  // Handle immediate search on Enter key
  const handleSearchSubmit = () => {
    updateParams({
      search: search,
    })
  }

  const toggleExpansion = (customerUuid: string) => {
    const newExpanded = new Set(expandedCustomers)
    if (newExpanded.has(customerUuid)) {
      newExpanded.delete(customerUuid)
    } else {
      newExpanded.add(customerUuid)
    }
    setExpandedCustomers(newExpanded)
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

  const getEnabledFeaturesCount = (licenseFeatures: Record<string, LicenseFeature>) => {
    return Object.values(licenseFeatures).filter(feature => feature.enabled).length
  }

  const handleResetFilters = () => {
    setSearch("")
  }

  const handleRowClick = (customer: Customer) => {
    router.push(`/customers/${customer.uuid}`)
  }

  if (loading && customers.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6 ml-6">
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer relationships</p>
        </div>
        <LoadingState message="Loading customers..." variant="card" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6 ml-6">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer relationships</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ListFilters
          searchValue={search}
          searchPlaceholder="Search by username, email, or name..."
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          onReset={handleResetFilters}
          hasActiveFilters={search.trim() !== ""}
          activeFilterCount={search.trim() !== "" ? 1 : 0}
        />
      </div>

      {error && (
        <ErrorAlert 
          error={error} 
          showRetry={true} 
          onRetry={refetch}
          className="mb-6"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Customers ({customers.length})
          </CardTitle>
          <CardDescription>Click on a customer to view details, or expand to see license features</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && customers.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No customers found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {customers.map((customer) => {
                const isExpanded = expandedCustomers.has(customer.uuid)
                const hasLicenseFeatures = Object.keys(customer.license_features).length > 0
                
                return (
                  <div key={customer.uuid} className="border rounded-lg overflow-hidden">
                    <div 
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 flex-1">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Username</p>
                            <p className="text-sm text-muted-foreground font-mono">{customer.user.username}</p>
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-sm text-muted-foreground">{customer.user.email}</p>
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Name</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.user.first_name && customer.user.last_name
                                ? `${customer.user.first_name} ${customer.user.last_name}`
                                : "Not provided"}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">License Features</p>
                            <p className="text-sm text-muted-foreground">
                              {getEnabledFeaturesCount(customer.license_features)} of {Object.keys(customer.license_features).length} enabled
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium">Joined</p>
                            <p className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(customer.created), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant={customer.user.is_active ? "default" : "secondary"}>
                            {customer.user.is_active ? "Active" : "Inactive"}
                          </Badge>
                          
                          {hasLicenseFeatures && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpansion(customer.uuid)
                              }}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              Features
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* License Features Section */}
                    {hasLicenseFeatures && (
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="border-t p-4 bg-muted/20">
                            <h4 className="text-sm font-medium mb-3">License Features</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(customer.license_features).map(([featureName, feature]) => (
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
              {!loading && customers.length > 0 && (
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