"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getJson, postJson, type AuthResponse } from "@/lib/api"

interface AuthContextType {
  user: AuthResponse | null
  loading: boolean
  refetch: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    // Skip authentication for public routes
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname
      if (pathname.startsWith('/charts/')) {
        setLoading(false)
        setUser(null)
        return
      }
    }

    try {
      const profile = await getJson<AuthResponse>("/accounts/profile/")
      setUser(profile)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const refetch = async () => {
    setLoading(true)
    await fetchProfile()
  }

  const logout = async () => {
    try {
      await postJson("/auth/logout/", {})
      setUser(null)
      // Redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    } catch (error) {
      console.error("Logout error:", error)
      // Even if logout fails, clear user state
      setUser(null)
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }

  return <AuthContext.Provider value={{ user, loading, refetch, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
