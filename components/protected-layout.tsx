"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"

interface ProtectedLayoutProps {
  children: React.ReactNode
}

function LayoutWithFloatingTrigger({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()
  
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        {!open && (
          <div className="fixed top-4 left-1 z-50">
            <SidebarTrigger className="h-10 w-10" />
          </div>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  )
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <LayoutWithFloatingTrigger>{children}</LayoutWithFloatingTrigger>
    </SidebarProvider>
  )
}
