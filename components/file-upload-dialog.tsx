"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload } from "lucide-react"
import { postFormData } from "@/lib/api"

interface FileUploadDialogProps {
  ecuSerial: string
  onFileUploaded: () => void
}

export function FileUploadDialog({ ecuSerial, onFileUploaded }: FileUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [comment, setComment] = useState("")
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  
  // Constants for validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_EXTENSIONS = ['.bin']

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
    }
    
    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Only .bin files are allowed for ECU uploads`
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    // Client-side validation
    const validationError = validateFile(file)
    if (validationError) {
      setErrors({ file: [validationError] })
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (comment.trim()) {
        formData.append("comment", comment.trim())
      }

      await postFormData(`/ecus/${ecuSerial}/files/`, formData)
      setFile(null)
      setComment("")
      setOpen(false)
      onFileUploaded()
    } catch (error: any) {
      console.error('Upload error:', error)
      
      if (error.status === 400 || error.status === 413 || error.status === 415) {
        // Parse validation errors from Django
        try {
          const errorData = error.validationErrors || await error.response?.json() || {}
          setErrors(errorData)
        } catch {
          // Fallback error messages based on status code
          if (error.status === 413) {
            setErrors({ general: ["File too large. Maximum size is 10MB."] })
          } else if (error.status === 415) {
            setErrors({ general: ["Unsupported file format. Only .bin files are allowed."] })
          } else {
            setErrors({ general: ["Invalid file. Please check the file format and size."] })
          }
        }
      } else if (error.status === 403) {
        setErrors({ general: ["Permission denied. You may not have access to upload files for this ECU."] })
      } else if (error.status >= 500) {
        setErrors({ general: ["Server error. Please try again later."] })
      } else {
        setErrors({ general: ["Failed to upload file. Please try again."] })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setFile(selectedFile || null)
    setErrors({}) // Clear errors when file changes
    
    // Validate immediately on selection
    if (selectedFile) {
      const validationError = validateFile(selectedFile)
      if (validationError) {
        setErrors({ file: [validationError] })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload ECU File</DialogTitle>
          <DialogDescription>
            Upload a .bin file (max 10MB) for ECU {ecuSerial}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription>{errors.general[0]}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input 
                id="file" 
                type="file" 
                accept=".bin" 
                onChange={handleFileChange} 
                required 
                disabled={loading} 
              />
              {file && !errors.file && (
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
              {errors.file && <p className="text-sm text-destructive">{errors.file[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={loading}
                placeholder="Add a comment about this file..."
                rows={3}
              />
              {errors.comment && <p className="text-sm text-destructive">{errors.comment[0]}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file}>
              {loading ? "Uploading..." : "Upload File"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
