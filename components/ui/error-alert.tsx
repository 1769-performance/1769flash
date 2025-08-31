"use client"

import { AlertTriangle, XCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ApiError, isApiError, getValidationErrors } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ErrorAlertProps {
  error: unknown
  title?: string
  className?: string
  showRetry?: boolean
  onRetry?: () => void
}

export function ErrorAlert({ 
  error, 
  title, 
  className, 
  showRetry = false, 
  onRetry 
}: ErrorAlertProps) {
  if (!error) return null

  if (error instanceof ApiError && error.validationErrors) {
    return null
  }

  const getErrorIcon = (status?: number) => {
    if (status === 403) return <XCircle className="h-4 w-4" />
    if (status === 404) return <Info className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const getErrorTitle = (error: unknown) => {
    if (title) return title
    
    if (isApiError(error)) {
      switch (error.status) {
        case 400:
          return "Invalid Request"
        case 401:
          return "Authentication Required"
        case 403:
          return "Access Denied"
        case 404:
          return "Not Found"
        case 422:
          return "Validation Error"
        case 429:
          return "Rate Limited"
        case 500:
        case 502:
        case 503:
        case 504:
          return "Server Error"
        default:
          return "Error"
      }
    }
    
    return "Error"
  }

  const getErrorMessage = (error: unknown) => {
    if (isApiError(error)) {
      return error.message
    }
    
    if (error instanceof Error) {
      return error.message
    }
    
    return "An unexpected error occurred"
  }

  const errorTitle = getErrorTitle(error)
  const errorMessage = getErrorMessage(error)
  const status = isApiError(error) ? error.status : undefined

  return (
    <Alert variant="destructive" className={className}>
      {getErrorIcon(status)}
      <AlertTitle>{errorTitle}</AlertTitle>
      <AlertDescription className="mt-2">
        <div>{errorMessage}</div>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              "mt-3 inline-flex items-center justify-center rounded-md text-sm font-medium",
              "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              "h-8 px-3 py-1"
            )}
          >
            Try Again
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}