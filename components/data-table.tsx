"use client"

import type React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DataTableProps<T> {
  data: T[]
  columns: {
    key: keyof T
    header: string
    render?: (value: any, item: T) => React.ReactNode
  }[]
  loading?: boolean
  pagination?: {
    currentPage: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    onNext: () => void
    onPrev: () => void
  }
  onRowClick?: (item: T) => void
}

export function DataTable<T>({ data, columns, loading = false, pagination, onRowClick }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-md border dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="dark:bg-gray-900/50 dark:border-gray-700">
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="dark:text-gray-200 dark:border-gray-700">
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="dark:border-gray-700">
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className="dark:border-gray-700">
                    <div className="h-4 bg-muted dark:bg-gray-700 animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="dark:bg-gray-900/50 dark:border-gray-700">
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="dark:text-gray-200 dark:border-gray-700">
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center dark:text-gray-400">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={index}
                  className={`dark:border-gray-700 ${
                    onRowClick
                      ? "cursor-pointer hover:bg-muted/50 dark:hover:bg-gray-800/50"
                      : "dark:hover:bg-gray-800/30"
                  }`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className="dark:text-gray-300 dark:border-gray-700">
                      {column.render ? column.render(item[column.key], item) : String(item[column.key] || "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onPrev}
              disabled={!pagination.hasPrev}
              className="dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={pagination.onNext}
              disabled={!pagination.hasNext}
              className="dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-200"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
