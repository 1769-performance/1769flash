"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CreditCard, Car, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"
import { getJson, type Payment } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

const statusColors: Record<string, string> = {
  succeeded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

export default function PaymentDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPayment = async () => {
      if (!params.uuid) return

      try {
        setLoading(true)
        const paymentData = await getJson<Payment>(`/payments/${params.uuid}/`)
        setPayment(paymentData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment")
      } finally {
        setLoading(false)
      }
    }

    fetchPayment()
  }, [params.uuid])

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error || "Payment not found"}</p>
            <Button asChild className="mt-4">
              <Link href="/payments">Back to Payments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6 ml-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/payments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Payment Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Payment Details
                </CardTitle>
                <CardDescription>Payment transaction information</CardDescription>
              </div>
              <Badge variant="secondary" className={`${statusColors[payment.status] || ""} text-lg px-3 py-1`}>
                {payment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment ID</p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">{payment.uuid}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-bold text-green-600 mt-1">{payment.total}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono">{payment.vehicle}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/vehicles/${payment.vehicle}`}>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-sm mt-1">{new Date(payment.created).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">{payment.description}</p>
              </div>
              
              {payment.features && Object.keys(payment.features).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Features Purchased</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(payment.features).map(([key, value]) => (
                      <Card key={key} className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium uppercase">{key}</span>
                          <Badge variant="outline" className="text-xs">
                            {typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/vehicles/${payment.vehicle}`}>
                  <Car className="h-4 w-4 mr-2" />
                  View Vehicle
                </Link>
              </Button>
              
              {user?.profile_type === "dealer" && payment.status === "succeeded" && (
                <Button variant="outline" disabled>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              )}
              
              {user?.profile_type === "dealer" && payment.status === "succeeded" && (
                <Button variant="outline" disabled>
                  Issue Refund
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}