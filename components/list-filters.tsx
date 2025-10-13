"use client"

import { useState, type ReactNode } from "react"
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface FilterField {
  id: string
  label: string
  content: ReactNode
}

interface ListFiltersProps {
  /** Search input value */
  searchValue: string
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Callback when search value changes */
  onSearchChange: (value: string) => void
  /** Callback when search is submitted (Enter key) - triggers immediate search */
  onSearchSubmit?: () => void
  /** Additional filter fields to display */
  filterFields?: FilterField[]
  /** Sort field content */
  sortField?: ReactNode
  /** Callback to reset all filters */
  onReset: () => void
  /** Whether filters are currently active */
  hasActiveFilters?: boolean
  /** Number of active filters (for badge display) */
  activeFilterCount?: number
  /** Default expanded state */
  defaultExpanded?: boolean
}

export function ListFilters({
  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  onSearchSubmit,
  filterFields = [],
  sortField,
  onReset,
  hasActiveFilters = false,
  activeFilterCount = 0,
  defaultExpanded = false,
}: ListFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Trigger immediate search when Enter is pressed
    if (onSearchSubmit) {
      onSearchSubmit()
    }
  }

  return (
    <div className="border rounded-lg bg-card">
      {/* Compact Header Bar */}
      <div className="flex items-center gap-2 p-3 sm:p-4">
        {/* Search Field - Always Visible */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-9 bg-background"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {/* Sort Field - Desktop Only */}
        {sortField && (
          <div className="hidden lg:block shrink-0">
            {sortField}
          </div>
        )}

        {/* Filter Toggle Button */}
        {(filterFields.length > 0 || sortField) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "shrink-0 gap-2 h-9",
              isExpanded && "bg-muted"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform hidden sm:block",
                isExpanded && "rotate-180"
              )}
            />
          </Button>
        )}

        {/* Reset Button - Only when filters are active */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="shrink-0 h-9 px-2 sm:px-3"
            title="Reset all filters"
          >
            <X className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>

      {/* Expandable Filter Section */}
      {isExpanded && (filterFields.length > 0 || sortField) && (
        <div className="border-t bg-muted/30 p-3 sm:p-4 space-y-3">
          {/* Mobile Sort Field */}
          {sortField && (
            <div className="lg:hidden space-y-1.5">
              <label className="text-sm font-medium">Sort</label>
              {sortField}
            </div>
          )}

          {/* Filter Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filterFields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label className="text-sm font-medium">{field.label}</label>
                {field.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
