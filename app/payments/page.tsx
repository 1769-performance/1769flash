"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { usePaginatedList } from "@/hooks/use-paginated-list"
import { useAuth } from "@/hooks/use-auth"
import type { Payment } from "@/lib/api"
import { CreditCard, Filter } from "lucide-react"

const statusColors: Record<string, string> = {
  succeeded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

export default function PaymentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState<string>("")
  const [ordering, setOrdering] = useState<string>("-created")

  const {
    data: payments,
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
  } = usePaginatedList<Payment>("/payments/", {
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

  // Dynamic columns based on user role
  const columns = [
    {
      key: "vehicle" as keyof Payment,
      header: "Vehicle",
      render: (vin: string) => (
        <span className="font-mono text-sm">{vin}</span>
      ),
    },
    {
      key: "status" as keyof Payment,
      header: "Status",
      render: (status: string) => (
        <Badge variant="secondary" className={statusColors[status] || ""}>
          {status}
        </Badge>
      ),
    },
    {
      key: "description" as keyof Payment,
      header: "Description",
      render: (description: string) => (
        <span className="text-sm" title={description}>
          {description.length > 50 ? `${description.substring(0, 50)}...` : description}
        </span>
      ),
    },
    {
      key: "total" as keyof Payment,
      header: "Total",
      render: (total: string) => (
        <span className="font-medium text-sm">{total}</span>
      ),
    },
    {
      key: "created" as keyof Payment,
      header: "Created",
      render: (date: string) => (
        <span className="text-sm text-muted-foreground">
          {new Date(date).toLocaleDateString()}
        </span>
      ),
    },
  ]

  const handleResetFilters = () => {
    setStatusFilter("all")
    setSearch("")
    setOrdering("-created")
  }

  const handleRowClick = (payment: Payment) => {
    router.push(`/payments/${payment.uuid}`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 ml-6">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">View payment history and manage billing</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
          <CardDescription>Search and filter your payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search description, VIN..."
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
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
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
                  <SelectItem value="-total">Highest amount</SelectItem>
                  <SelectItem value="total">Lowest amount</SelectItem>
                  <SelectItem value="status">Status A-Z</SelectItem>
                  <SelectItem value="-status">Status Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </div>
          </div>
          
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading payments: {error?.message || 'Unknown error'}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Payment History ({payments.length})
          </CardTitle>
          <CardDescription>Click on a payment to view details</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={payments}
            columns={columns}
            loading={loading}
            onRowClick={handleRowClick}
            pagination={{
              currentPage,
              totalPages,
              hasNext,
              hasPrev,
              onNext: nextPage,
              onPrev: prevPage,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}