"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"

export function PaymentsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payments
        </CardTitle>
        <CardDescription>View payment history and status</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Recent payments and billing information</p>
        <Button asChild variant="outline" className="w-full bg-transparent">
          <Link href="/payments">View All Payments</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
