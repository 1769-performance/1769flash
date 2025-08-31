// Custom error classes for better error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any,
    public validationErrors?: Record<string, string[]>
  ) {
    super(message)
    this.name = "ApiError"
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let data: any = null
    let validationErrors: Record<string, string[]> | undefined
    let message = `HTTP ${response.status}: ${response.statusText}`

    try {
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        data = await response.json()
        
        // Handle different error response formats
        if (data.detail) {
          message = data.detail
        } else if (data.message) {
          message = data.message
        } else if (data.error) {
          message = data.error
        }

        // Handle validation errors (typically 400/422 responses)
        if (typeof data === "object" && !data.detail && !data.message && !data.error) {
          validationErrors = data
          const fieldErrors = Object.entries(data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`)
            .join("; ")
          message = fieldErrors || message
        }
      } else {
        message = await response.text() || message
      }
    } catch {
      // If we can't parse the response body, use the default message
    }

    // Customize messages based on status codes
    switch (response.status) {
      case 400:
        message = validationErrors ? "Validation failed: " + message : "Bad request: " + message
        break
      case 401:
        message = "Authentication required. Please log in."
        break
      case 403:
        message = "Access denied: " + (data?.detail || "You don't have permission to access this resource")
        break
      case 404:
        message = "Resource not found: " + (data?.detail || "The requested resource could not be found")
        break
      case 422:
        message = "Validation error: " + message
        break
      case 429:
        message = "Too many requests. Please wait a moment before trying again."
        break
      case 500:
        message = "Internal server error. Please try again later."
        break
      case 502:
      case 503:
      case 504:
        message = "Service temporarily unavailable. Please try again later."
        break
    }

    return new ApiError(response.status, message, data, validationErrors)
  }
}

// CSRF token utilities
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrftoken') {
      return decodeURIComponent(value)
    }
  }
  return null
}

// API client for 1769Flash Backend Server
export async function api(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...init.headers as Record<string, string>,
  }
  
  // Only set Content-Type to application/json if body is not FormData
  if (!(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  
  // Add CSRF token for non-GET requests
  const csrfToken = getCsrfToken()
  if (csrfToken && init.method && init.method.toUpperCase() !== 'GET') {
    headers['X-CSRFToken'] = csrfToken
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    credentials: "include",
    headers,
    ...init,
  })

  // Handle 401 specifically for automatic redirect
  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
      window.location.href = "/login"
    }
  }

  // For non-2xx responses, throw our custom error
  if (!res.ok) {
    throw await ApiError.fromResponse(res)
  }

  return res
}

// Error response type definitions
export interface ValidationError {
  [field: string]: string[]
}

export interface ApiErrorResponse {
  detail?: string
  message?: string
  error?: string
  [key: string]: any
}

// Helper function for GET requests that return JSON
export async function getJson<T>(path: string): Promise<T> {
  const response = await api(path)
  return response.json()
}

// Helper function for POST requests with JSON body
export async function postJson<T>(path: string, data: any): Promise<T> {
  const response = await api(path, {
    method: "POST",
    body: JSON.stringify(data),
  })
  return response.json()
}

// Helper function for PUT requests with JSON body
export async function putJson<T>(path: string, data: any): Promise<T> {
  const response = await api(path, {
    method: "PUT",
    body: JSON.stringify(data),
  })
  return response.json()
}

// Helper function for DELETE requests
export async function deleteJson<T = void>(path: string): Promise<T> {
  const response = await api(path, {
    method: "DELETE",
  })
  
  // DELETE requests might not return JSON
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T
  }
  
  return response.json()
}

// Helper function for multipart form data (file uploads)
export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await api(path, {
    method: "POST",
    body: formData,
    // Don't set headers at all for FormData - the browser will set Content-Type boundary
    // and the api() function will add CSRF token
  })
  return response.json()
}

// Helper function to check if an error is an ApiError with specific status
export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

// Helper function to extract validation errors from an ApiError
export function getValidationErrors(error: unknown): Record<string, string[]> | null {
  if (error instanceof ApiError && error.validationErrors) {
    return error.validationErrors
  }
  return null
}

// Types based on the OpenAPI specification
export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
}

export interface AuthResponse {
  user: User
  profile_type: "dealer" | "customer"
  profile: any // Structure varies by profile_type
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Project {
  uuid: string
  title: string
  status: "new" | "ongoing" | "finished"
  created: string
  modified: string
  vehicle: string
  dealer: string
  customer: string
  unread_count: string
}

export interface Vehicle {
  vin: string
  series?: string
  fa_codes?: string[]
  egs_paid: boolean
  swap_paid: boolean
  egs_swap_paid: boolean
  is_test: boolean
  dealer?: string
  customer?: string
  created?: string
  projects?: Project[]
  ecus?: ECU[]
  payments?: Payment[]
  licenses?: License[]
}

export interface SVK {
  type: string
  id: string
  main_version: string
  sub_version: string
  patch_version: string
  ncd?: string
}

export interface SVT {
  type: string
  svks: SVK[]
}

export interface FSC {
  app_id: string
  data?: string
}

export interface ECU {
  vehicle: string
  dealer: string
  customer: string
  type: "original" | "1769"
  address: number
  serial: string
  man_date: string
  name: string
  name_BMW: string
  name_esys?: string
  name_a2l?: string
  istep?: string
  mcu_id?: string
  svts: SVT[]
  fscs: FSC[]
  files?: File[]
}

export interface File {
  uuid: string
  name: string
  comment?: string
  url: string
  created: string
  logs?: Log[]
}

export interface Log {
  uuid: string
  name: string
  comment?: string
  url: string
  created: string
}

export interface Customer {
  uuid: string
  user: User
  license_features: Record<string, LicenseFeature>
  created: string
}

export interface CustomerDetail extends Customer {
  projects: Project[]
  vehicles: Vehicle[]
}

export interface Payment {
  uuid: string
  vehicle: string
  status: string
  description: string
  total: string
  created: string
  features?: Record<string, any>
}

export interface LicenseFeature {
  enabled: boolean
  expires_at: string | null
}

export interface License {
  uuid: string
  vehicle: string
  status: string
  version: string
  features: Record<string, LicenseFeature>
  expiration_date: string | null
  created: string
  modified: string
}
