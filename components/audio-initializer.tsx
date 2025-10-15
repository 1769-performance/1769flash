"use client"

import { useEffect } from "react"
import { initializeNotificationAudio } from "@/hooks/use-project-messages"

/**
 * Component to initialize notification audio on first user interaction
 * This helps bypass browser autoplay restrictions for audio
 */
export function AudioInitializer() {
  useEffect(() => {
    // Initialize audio on first user interaction
    const handleUserInteraction = () => {
      initializeNotificationAudio()
      // Remove listeners after initialization
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('scroll', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }

    // Add event listeners for common user interactions
    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })
    document.addEventListener('scroll', handleUserInteraction, { once: true })
    document.addEventListener('touchstart', handleUserInteraction, { once: true })

    // Cleanup function
    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('scroll', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [])

  return null // This component doesn't render anything
}