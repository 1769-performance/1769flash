"use client"

import { useState, useEffect } from "react"
import { getJson, type PaginatedResponse, ApiError, isApiError } from "@/lib/api"

interface UsePaginatedListOptions {
  limit?: number
  initialParams?: Record<string, any>
}

interface UsePaginatedListResult<T> {
  data: T[]
  count: number
  loading: boolean
  error: ApiError | Error | null
  hasNext: boolean
  hasPrev: boolean
  nextPage: () => void
  prevPage: () => void
  updateParams: (newParams: Record<string, any>) => void
  refetch: () => void
  currentPage: number
  totalPages: number
}

export function usePaginatedList<T>(
  endpoint: string, 
  options: UsePaginatedListOptions = {}
): UsePaginatedListResult<T> {
  const { limit = 20, initialParams = {} } = options
  const [data, setData] = useState<PaginatedResponse<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [offset, setOffset] = useState(0)
  const [params, setParams] = useState(initialParams)

  const fetchData = async (newOffset = 0, newParams = params) => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: newOffset.toString(),
        ...Object.fromEntries(Object.entries(newParams).filter(([_, value]) => value !== undefined && value !== "")),
      })

      const response = await getJson<PaginatedResponse<T>>(`${endpoint}?${queryParams}`)
      setData(response)
      setOffset(newOffset)
    } catch (err) {
      // Preserve the original error type for better error handling
      if (err instanceof ApiError) {
        setError(err)
      } else if (err instanceof Error) {
        setError(err)
      } else {
        setError(new Error("An unexpected error occurred"))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(0, params)
  }, [endpoint, limit, JSON.stringify(params)])

  const nextPage = () => {
    if (data?.next) {
      fetchData(offset + limit)
    }
  }

  const prevPage = () => {
    if (data?.previous && offset > 0) {
      fetchData(Math.max(0, offset - limit))
    }
  }

  const updateParams = (newParams: Record<string, any>) => {
    setParams(newParams)
    setOffset(0)
  }

  const refetch = () => {
    fetchData(offset, params)
  }

  return {
    data: data?.results || [],
    count: data?.count || 0,
    loading,
    error,
    hasNext: !!data?.next,
    hasPrev: !!data?.previous,
    nextPage,
    prevPage,
    updateParams,
    refetch,
    currentPage: Math.floor(offset / limit) + 1,
    totalPages: data ? Math.ceil(data.count / limit) : 0,
  }
}
