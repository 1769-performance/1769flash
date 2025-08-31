"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorAlert } from "@/components/ui/error-alert"
import { ValidationErrors, InlineFieldError } from "@/components/ui/validation-errors"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { postJson, type AuthResponse, ApiError, getValidationErrors } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

export default function SignupPage() {
  const [accountType, setAccountType] = useState<"dealer" | "customer">("customer")
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    company_name: "", // For dealers
    dealer_uuid: "", // For customers
  })
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { refetch } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const endpoint = accountType === "dealer" ? "/auth/register/dealer/" : "/auth/register/customer/"

      // Prepare payload based on account type
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        ...(formData.first_name && { first_name: formData.first_name }),
        ...(formData.last_name && { last_name: formData.last_name }),
        ...(accountType === "dealer" && { company_name: formData.company_name }),
        ...(accountType === "customer" && { dealer_uuid: formData.dealer_uuid }),
      }

      const response = await postJson<AuthResponse>(endpoint, payload)
      await refetch() // Update auth context
      router.push("/projects")
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Registration failed. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join the 1769Flash platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={accountType}
            onValueChange={(value) => setAccountType(value as "dealer" | "customer")}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="dealer">Dealer</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorAlert error={error} />
            <ValidationErrors error={error} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={loading}
                />
                <InlineFieldError error={getValidationErrors(error)?.first_name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={loading}
                />
                <InlineFieldError error={getValidationErrors(error)?.last_name} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <InlineFieldError error={getValidationErrors(error)?.username} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <InlineFieldError error={getValidationErrors(error)?.email} />
            </div>

            {accountType === "dealer" && (
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <InlineFieldError error={getValidationErrors(error)?.company_name} />
              </div>
            )}

            {accountType === "customer" && (
              <div className="space-y-2">
                <Label htmlFor="dealer_uuid">Dealer UUID</Label>
                <Input
                  id="dealer_uuid"
                  name="dealer_uuid"
                  type="text"
                  value={formData.dealer_uuid}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Enter your dealer's UUID"
                />
                <InlineFieldError error={getValidationErrors(error)?.dealer_uuid} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <InlineFieldError error={getValidationErrors(error)?.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirm">Confirm Password</Label>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <InlineFieldError error={getValidationErrors(error)?.password_confirm} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : `Create ${accountType} account`}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
