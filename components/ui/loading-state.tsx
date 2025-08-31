"use client"

import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "inline" | "card"
}

export function LoadingState({ 
  message = "Loading...", 
  className,
  size = "md",
  variant = "inline"
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  const content = (
    <div className={cn(
      "flex items-center justify-center gap-2 text-muted-foreground",
      variant === "card" ? "p-6" : "py-4",
      className
    )}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      <span className="text-sm">{message}</span>
    </div>
  )

  if (variant === "card") {
    return (
      <Card>
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    )
  }

  return content
}

// Skeleton component for loading states with structure
export function LoadingSkeleton({ 
  lines = 3, 
  className 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-muted rounded",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}