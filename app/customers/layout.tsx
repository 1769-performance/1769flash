import type React from "react"
import { ProtectedLayout } from "@/components/protected-layout"

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>
}
