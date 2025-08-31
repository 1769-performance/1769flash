"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, FileText, AlertTriangle, Eye, EyeOff } from "lucide-react"
import type { License } from "@/lib/api"

interface LicensesTableProps {
  licenses: License[]
  loading?: boolean
  className?: string
}

export function LicensesTable({ licenses, loading = false, className }: LicensesTableProps) {
  const router = useRouter()
  const [expandedLicenses, setExpandedLicenses] = useState<Set<string>>(new Set())
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

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

  const handleLicenseClick = (license: License) => {
    router.push(`/licenses/${license.uuid}`)
  }

  const statusLabels: Record<string, string> = {
    "awaiting_hardware": "Awaiting Hardware Info",
    "pending_generation": "Pending Generation Pipeline", 
    "issued": "Issued",
    "required_update": "Update Is Required",
    "failed": "Failed",
    "expired": "Expired"
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "issued":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "pending_generation":
      case "awaiting_hardware":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "expired":
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "required_update":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusLabel = (status: string) => {
    return statusLabels[status.toLowerCase()] || status
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

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    )
  }

  if (!licenses?.length) {
    return (

      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No licenses found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {licenses.map((license) => {
        const isExpanded = expandedLicenses.has(license.uuid)
        
        return (
          <div key={license.uuid} className="border rounded-lg overflow-hidden">
            <div 
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handleLicenseClick(license)}
            >
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Key</p>
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
                      className={`${getStatusColor(license.status)} text-xs whitespace-nowrap`}
                    >
                      {getStatusLabel(license.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Version</p>
                    <p className="text-sm text-muted-foreground">{license.version}</p>
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
                  
                  {license.features && Object.keys(license.features).length > 0 && (
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
            {license.features && Object.keys(license.features).length > 0 && (
              <Collapsible open={isExpanded}>
                <CollapsibleContent>
                  <div className="border-t p-4 bg-muted/20">
                    <h4 className="text-sm font-medium mb-3">Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(license.features).map(([featureName, feature]) => (
                        <div key={featureName} className="space-y-2 p-3 border rounded-md">
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
    </div>
  )
}