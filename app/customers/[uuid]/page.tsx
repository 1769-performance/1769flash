"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { ErrorAlert } from "@/components/ui/error-alert"
import { LoadingState } from "@/components/ui/loading-state"
import { DataTable } from "@/components/data-table"
import { getJson, ApiError, type CustomerDetail, type Project, type Vehicle } from "@/lib/api"
import { 
  ArrowLeft, 
  User, 
  Building, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle,
  FileText,
  Car
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface CustomerDetailPageProps {
  params: Promise<{
    uuid: string
  }>
}

const statusColors = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ongoing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  finished: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["customer-features", "dealer-features"]))

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getJson<CustomerDetail>(`/accounts/customers/${resolvedParams.uuid}/?expand=projects,vehicles`)
      setCustomer(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch customer"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomer()
  }, [resolvedParams.uuid])

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
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

  const renderLicenseFeatures = (features: Record<string, any>, title: string, sectionId: string) => {
    const isExpanded = expandedSections.has(sectionId)
    const hasFeatures = Object.keys(features).length > 0

    if (!hasFeatures) return null

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection(sectionId)}
          >
            <span className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {title}
            </span>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(features).map(([featureName, feature]) => (
                  <div key={featureName} className="space-y-2 p-3 border rounded-md bg-muted/20">
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
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  // Projects table columns
  const projectColumns = [
    {
      key: "title" as keyof Project,
      header: "Title",
    },
    {
      key: "status" as keyof Project,
      header: "Status",
      render: (status: string) => (
        <Badge variant="secondary" className={statusColors[status as keyof typeof statusColors]}>
          {status}
        </Badge>
      ),
    },
    {
      key: "vehicle" as keyof Project,
      header: "Vehicle",
    },
    {
      key: "created" as keyof Project,
      header: "Created",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      key: "unread_count" as keyof Project,
      header: "Unread",
      render: (count: string | number) => (
        <Badge variant={Number(count) > 0 ? "destructive" : "secondary"}>
          {count}
        </Badge>
      ),
    },
  ]

  // Vehicles table columns
  const vehicleColumns = [
    {
      key: "vin" as keyof Vehicle,
      header: "VIN",
    },
    {
      key: "egs_paid" as keyof Vehicle,
      header: "EGS Paid",
      render: (paid: boolean) => (
        <Badge variant={paid ? "default" : "secondary"}>
          {paid ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "swap_paid" as keyof Vehicle,
      header: "Swap Paid",
      render: (paid: boolean) => (
        <Badge variant={paid ? "default" : "secondary"}>
          {paid ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "egs_swap_paid" as keyof Vehicle,
      header: "EGS Swap Paid",
      render: (paid: boolean) => (
        <Badge variant={paid ? "default" : "secondary"}>
          {paid ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "created" as keyof Vehicle,
      header: "Created",
      render: (date: string | undefined) => date ? new Date(date).toLocaleDateString() : "N/A",
    },
  ]

  const handleProjectClick = (project: Project) => {
    router.push(`/projects/${project.uuid}`)
  }

  const handleVehicleClick = (vehicle: Vehicle) => {
    router.push(`/vehicles/${vehicle.vin}`)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <h1 className="text-3xl font-bold">Customer Details</h1>
        </div>
        <LoadingState message="Loading customer details..." variant="card" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <h1 className="text-3xl font-bold">Customer Details</h1>
        </div>
        <ErrorAlert 
          error={error || new Error("Customer not found")} 
          showRetry={true} 
          onRetry={fetchCustomer}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">
            {customer?.user?.first_name && customer?.user?.last_name
              ? `${customer.user.first_name} ${customer.user.last_name}`
              : customer?.user?.username || "Loading..."}
          </h1>
          {customer?.user && (
            <Badge variant={customer.user.is_active ? "default" : "secondary"}>
              {customer.user.is_active ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">Customer Details & Management</p>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Customer Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer?.user ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Username:</span>
                  <p className="font-medium font-mono">{customer.user.username}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{customer.user.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">First Name:</span>
                  <p className="font-medium">{customer.user.first_name || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Name:</span>
                  <p className="font-medium">{customer.user.last_name || "Not provided"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Joined:</span>
                  <p className="font-medium">{formatDistanceToNow(new Date(customer.created), { addSuffix: true })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium">{customer.user.is_active ? "Active" : "Inactive"}</p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* License Features */}
      {renderLicenseFeatures(customer.license_features, "Customer License Features", "customer-features")}

      {/* Projects and Vehicles Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Projects ({customer?.projects?.length || 0})
            </CardTitle>
            <CardDescription>Customer&apos;s projects and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            {!customer?.projects ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ) : customer.projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No projects found</p>
              </div>
            ) : (
              <DataTable
                data={customer.projects}
                columns={projectColumns}
                onRowClick={handleProjectClick}
              />
            )}
          </CardContent>
        </Card>

        {/* Vehicles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-6 w-6" />
              Vehicles ({customer?.vehicles?.length || 0})
            </CardTitle>
            <CardDescription>Customer&apos;s registered vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            {!customer?.vehicles ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ) : customer.vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Car className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No vehicles found</p>
              </div>
            ) : (
              <DataTable
                data={customer.vehicles}
                columns={vehicleColumns}
                onRowClick={handleVehicleClick}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}