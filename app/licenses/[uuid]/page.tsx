"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, Car, ExternalLink, Eye, EyeOff, AlertTriangle, RefreshCw, Download, Settings } from "lucide-react"
import Link from "next/link"
import { getJson, type License } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

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

export default function LicenseDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const [license, setLicense] = useState<License | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyVisible, setKeyVisible] = useState(false)

  useEffect(() => {
    const fetchLicense = async () => {
      if (!params.uuid) return

      try {
        setLoading(true)
        const licenseData = await getJson<License>(`/licenses/${params.uuid}/`)
        setLicense(licenseData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load license")
      } finally {
        setLoading(false)
      }
    }

    fetchLicense()
  }, [params.uuid])

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

  const getEnabledFeaturesCount = () => {
    if (!license) return 0
    return Object.values(license.features).filter(feature => feature.enabled).length
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !license) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error || "License not found"}</p>
            <Button asChild className="mt-4">
              <Link href="/licenses">Back to Licenses</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6 ml-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/licenses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Licenses
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* License Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Software License
                </CardTitle>
                <CardDescription>License details and feature management</CardDescription>
              </div>
              <Badge variant="secondary" className={`${statusColors[license.status] || ""} text-lg px-3 py-1`}>
                {statusLabels[license.status] || license.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">License Key</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                    {keyVisible ? license.uuid : `${license.uuid.slice(0, 8)}...${license.uuid.slice(-8)}`}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setKeyVisible(!keyVisible)}
                    className="h-8 w-8 p-0"
                  >
                    {keyVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono">{license.vehicle}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/vehicles/${license.vehicle}`}>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Version</p>
                <p className="text-sm mt-1 font-mono">{license.version}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm mt-1">{new Date(license.created).toLocaleString()}</p>
              </div>
            </div>
            
            {license.expiration_date && (
              <div className="mt-4 p-3 border rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  {isFeatureExpired(license.expiration_date) && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  {!isFeatureExpired(license.expiration_date) && 
                   isFeatureExpiringSoon(license.expiration_date) && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm font-medium">License Expiration:</span>
                  <span className="text-sm">
                    {new Date(license.expiration_date).toLocaleDateString()}
                  </span>
                  {isFeatureExpired(license.expiration_date) && (
                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                  )}
                  {!isFeatureExpired(license.expiration_date) && 
                   isFeatureExpiringSoon(license.expiration_date) && (
                    <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                      Expiring Soon
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              License Features ({getEnabledFeaturesCount()} of {Object.keys(license.features).length} enabled)
            </CardTitle>
            <CardDescription>
              Feature availability and expiration details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(license.features).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No features configured for this license</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(license.features).map(([featureName, feature]) => (
                  <Card key={featureName} className={`relative ${feature.enabled ? 'border-green-200' : 'border-gray-200'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium uppercase">
                          {featureName}
                        </CardTitle>
                        <Badge 
                          variant={feature.enabled ? "default" : "secondary"}
                          className={feature.enabled ? "bg-green-100 text-green-800" : ""}
                        >
                          {feature.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {feature.enabled ? (
                        <div className="space-y-2">
                          {feature.expires_at ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {isFeatureExpired(feature.expires_at) && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                {!isFeatureExpired(feature.expires_at) && 
                                 isFeatureExpiringSoon(feature.expires_at) && (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className="text-sm font-medium">Expires:</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(feature.expires_at).toLocaleDateString()}
                              </p>
                              
                              {isFeatureExpired(feature.expires_at) && (
                                <Badge variant="destructive" className="text-xs">
                                  Feature Expired
                                </Badge>
                              )}
                              {!isFeatureExpired(feature.expires_at) && 
                               isFeatureExpiringSoon(feature.expires_at) && (
                                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                  Expiring in {Math.ceil((new Date(feature.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <p className="text-sm text-green-600 font-medium">Permanent Access</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          This feature is not enabled for your license
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* License Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Available actions for this license
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={`/vehicles/${license.vehicle}`}>
                  <Car className="h-4 w-4 mr-2" />
                  View Vehicle
                </Link>
              </Button>
              
              {license.status === "issued" && (
                <Button variant="outline" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Download License File
                </Button>
              )}
              
              {user?.profile_type === "dealer" && (
                <Button 
                  variant="outline" 
                  disabled={license.status === "pending_generation"}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate License
                </Button>
              )}
              
              {user?.profile_type === "dealer" && license.status === "failed" && (
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Generation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* License History */}
        <Card>
          <CardHeader>
            <CardTitle>License History</CardTitle>
            <CardDescription>
              Timeline of license events and modifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                <div>
                  <p className="text-sm font-medium">License Created</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(license.created).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {license.modified !== license.created && (
                <div className="flex items-start gap-3 p-3 border rounded-md">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="text-sm font-medium">License Modified</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(license.modified).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {license.status === "issued" && (
                <div className="flex items-start gap-3 p-3 border rounded-md border-green-200 bg-green-50">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">License Issued</p>
                    <p className="text-xs text-green-600">
                      License is active and ready for use
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}