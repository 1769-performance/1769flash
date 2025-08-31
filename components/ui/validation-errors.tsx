"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getValidationErrors, isApiError } from "@/lib/api"

interface ValidationErrorsProps {
  error: unknown
  className?: string
}

interface FieldErrorsProps {
  errors: Record<string, string[]>
  className?: string
}

export function ValidationErrors({ error, className }: ValidationErrorsProps) {
  const validationErrors = getValidationErrors(error)
  
  if (!validationErrors) {
    return null
  }

  return <FieldErrors errors={validationErrors} className={className} />
}

export function FieldErrors({ errors, className }: FieldErrorsProps) {
  const errorEntries = Object.entries(errors)
  
  if (errorEntries.length === 0) {
    return null
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <ul className="space-y-1">
          {errorEntries.map(([field, fieldErrors]) => (
            <li key={field} className="text-sm">
              <span className="font-medium capitalize">
                {field.replace(/_/g, " ")}:
              </span>{" "}
              {Array.isArray(fieldErrors) ? fieldErrors.join(", ") : fieldErrors}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

// Component for inline field error display (for form inputs)
interface InlineFieldErrorProps {
  error?: string[]
  className?: string
}

export function InlineFieldError({ error, className }: InlineFieldErrorProps) {
  if (!error || error.length === 0) {
    return null
  }

  return (
    <p className={`text-sm text-destructive ${className || ""}`}>
      {error.join(", ")}
    </p>
  )
}