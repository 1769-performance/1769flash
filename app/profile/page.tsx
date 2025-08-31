"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ErrorAlert } from "@/components/ui/error-alert"
import { ValidationErrors, InlineFieldError } from "@/components/ui/validation-errors"
import { useAuth } from "@/hooks/use-auth"
import { putJson, postJson, ApiError, getValidationErrors } from "@/lib/api"

export default function ProfilePage() {
  const { user, refetch } = useAuth()
  const [profileData, setProfileData] = useState({
    first_name: user?.user.first_name || "",
    last_name: user?.user.last_name || "",
  })
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
  })
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess("")

    try {
      await putJson("/accounts/profile/", profileData)
      await refetch()
      setSuccess("Profile updated successfully")
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Profile update failed. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess("")

    try {
      await postJson("/auth/change-password/", passwordData)
      setPasswordData({ current_password: "", new_password: "" })
      setSuccess("Password changed successfully")
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Password change failed. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 ml-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {success && (
        <Alert className="mb-6">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <ErrorAlert error={error} className="mb-6" />
      <ValidationErrors error={error} className="mb-6" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <p className="text-sm text-muted-foreground">{user.user.username}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{user.user.email}</p>
              </div>
            </div>
            <div>
              <Label>Account Type</Label>
              <p className="text-sm text-muted-foreground capitalize">{user.profile_type}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Profile</CardTitle>
            <CardDescription>Change your first and last name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, first_name: e.target.value }))}
                    disabled={loading}
                  />
                  <InlineFieldError error={getValidationErrors(error)?.first_name} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, last_name: e.target.value }))}
                    disabled={loading}
                  />
                  <InlineFieldError error={getValidationErrors(error)?.last_name} />
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, current_password: e.target.value }))}
                  disabled={loading}
                  required
                />
                <InlineFieldError error={getValidationErrors(error)?.current_password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, new_password: e.target.value }))}
                  disabled={loading}
                  required
                />
                <InlineFieldError error={getValidationErrors(error)?.new_password} />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
