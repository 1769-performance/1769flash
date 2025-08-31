"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, CreditCard } from "lucide-react"
import type { Payment } from "@/lib/api"

interface PaymentsTableProps {
  payments: Payment[]
  loading?: boolean
  className?: string
}

export function PaymentsTable({ payments, loading = false, className }: PaymentsTableProps) {
  const router = useRouter()
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set())

  const toggleExpansion = (paymentUuid: string) => {
    const newExpanded = new Set(expandedPayments)
    if (newExpanded.has(paymentUuid)) {
      newExpanded.delete(paymentUuid)
    } else {
      newExpanded.add(paymentUuid)
    }
    setExpandedPayments(newExpanded)
  }

  const handlePaymentClick = (payment: Payment) => {
    router.push(`/payments/${payment.uuid}`)
  }

  const statusLabels: Record<string, string> = {
    "pending": "Pending",
    "processing": "Processing", 
    "succeeded": "Succeeded",
    "failed": "Failed",
    "canceled": "Cancelled",
    "requires_action": "Requires Action",
    "paid": "Paid",
    "unpaid": "Unpaid",
    "other": "Other"
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "succeeded":
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "failed":
      case "canceled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "requires_action":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "unpaid":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusLabel = (status: string) => {
    return statusLabels[status.toLowerCase()] || status
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    )
  }

  if (!payments?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No payments found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => {
        const isExpanded = expandedPayments.has(payment.uuid)
        
        return (
          <div key={payment.uuid} className="border rounded-lg overflow-hidden">
            <div 
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handlePaymentClick(payment)}
            >
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(payment.status)} text-xs whitespace-nowrap`}
                    >
                      {getStatusLabel(payment.status)}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground truncate">{payment.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total</p>
                    <p className="text-sm font-mono whitespace-nowrap">{payment.total}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(payment.created).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {payment.features && Object.keys(payment.features).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpansion(payment.uuid)
                    }}
                    className="ml-2"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Features
                  </Button>
                )}
              </div>
            </div>

            {/* Features Section */}
            {payment.features && Object.keys(payment.features).length > 0 && (
              <Collapsible open={isExpanded}>
                <CollapsibleContent>
                  <div className="border-t p-4 bg-muted/20">
                    <h4 className="text-sm font-medium mb-3">Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(payment.features).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            {key}
                          </p>
                          <div className="text-sm">
                            {typeof value === 'object' && value !== null ? (
                              <div className="space-y-1">
                                {Object.entries(value).map(([subKey, subValue]) => (
                                  <div key={subKey} className="flex justify-between">
                                    <span className="text-muted-foreground">{subKey}:</span>
                                    <span>{String(subValue)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>{String(value)}</span>
                            )}
                          </div>
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