"use client"

import { useState, useMemo } from "react"
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react"
import type { FilterState, ParsedLogEntry } from "@/lib/types"

interface FilterPanelProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  data: ParsedLogEntry[]
  isFiltering?: boolean
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
const STATUS_CODE_GROUPS = [
  { label: "2xx Success", value: 200 },
  { label: "3xx Redirect", value: 300 },
  { label: "4xx Client Error", value: 400 },
  { label: "5xx Server Error", value: 500 },
]

function getUniqueValues(data: ParsedLogEntry[]) {
  // For large datasets, sample first 50k entries for unique values
  const sampleSize = Math.min(data.length, 50000)
  const sample = data.slice(0, sampleSize)

  const statusSet = new Set<number>()
  const methodSet = new Set<string>()

  for (const entry of sample) {
    statusSet.add(entry.status)
    methodSet.add(entry.method)
  }

  return {
    uniqueStatusCodes: Array.from(statusSet).sort((a, b) => a - b),
    uniqueMethods: Array.from(methodSet),
  }
}

export function FilterPanel({ filters, onFilterChange, data, isFiltering }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const { uniqueStatusCodes, uniqueMethods, maxSize } = useMemo(() => {
    const values = getUniqueValues(data)
    // Calculate max size from data for validation
    let max = 0
    const sampleSize = Math.min(data.length, 50000)
    for (let i = 0; i < sampleSize; i++) {
      if (data[i].size > max) {
        max = data[i].size
      }
    }
    return { ...values, maxSize: max }
  }, [data])

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const updateSizeRange = (field: "min" | "max", value: string) => {
    const newRange = { ...filters.sizeRange, [field]: value }
    
    // Validate: ensure max >= min if both are set
    if (newRange.min && newRange.max) {
      const minNum = Number.parseInt(newRange.min)
      const maxNum = Number.parseInt(newRange.max)
      if (!isNaN(minNum) && !isNaN(maxNum) && minNum > maxNum) {
        // If min exceeds max, adjust the other field
        if (field === "min") {
          newRange.max = newRange.min
        } else {
          newRange.min = newRange.max
        }
      }
    }
    
    updateFilter("sizeRange", newRange)
  }

  const toggleStatusCode = (code: number) => {
    const newCodes = filters.statusCodes.includes(code)
      ? filters.statusCodes.filter((c) => c !== code)
      : [...filters.statusCodes, code]
    updateFilter("statusCodes", newCodes)
  }

  const toggleMethod = (method: string) => {
    const newMethods = filters.httpMethods.includes(method)
      ? filters.httpMethods.filter((m) => m !== method)
      : [...filters.httpMethods, method]
    updateFilter("httpMethods", newMethods)
  }

  const clearFilters = () => {
    onFilterChange({
      dateRange: { start: "", end: "" },
      ipAddress: "",
      urlPattern: "",
      statusCodes: [],
      httpMethods: [],
      sizeRange: { min: "", max: "" },
    })
  }

  const hasActiveFilters =
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.ipAddress ||
    filters.urlPattern ||
    filters.statusCodes.length > 0 ||
    filters.httpMethods.length > 0 ||
    filters.sizeRange.min ||
    filters.sizeRange.max

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary">
            <Filter className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Filters</h2>
            <p className="text-sm text-muted-foreground">Narrow down your data before analysis</p>
          </div>
          {isFiltering && (
            <div className="flex items-center gap-2 ml-4 text-sm text-primary">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Filtering...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              disabled={isFiltering}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          className={`p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isFiltering ? "opacity-50 pointer-events-none" : ""}`}
        >
          {/* Date Range - Spans full width to accommodate two inputs */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="datetime-local"
                value={filters.dateRange.start}
                onChange={(e) => updateFilter("dateRange", { ...filters.dateRange, start: e.target.value })}
                className="flex-1 min-w-0 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Start"
              />
              <input
                type="datetime-local"
                value={filters.dateRange.end}
                onChange={(e) => updateFilter("dateRange", { ...filters.dateRange, end: e.target.value })}
                className="flex-1 min-w-0 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="End"
              />
            </div>
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">IP Address</label>
            <input
              type="text"
              value={filters.ipAddress}
              onChange={(e) => updateFilter("ipAddress", e.target.value)}
              placeholder="e.g., 10.223.157"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* URL Pattern */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">URL Pattern</label>
            <input
              type="text"
              value={filters.urlPattern}
              onChange={(e) => updateFilter("urlPattern", e.target.value)}
              placeholder="e.g., /assets, /api"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* HTTP Methods */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">HTTP Methods</label>
            <div className="flex flex-wrap gap-2">
              {uniqueMethods.length > 0
                ? uniqueMethods.map((method) => (
                    <button
                      key={method}
                      onClick={() => toggleMethod(method)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        filters.httpMethods.includes(method)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {method}
                    </button>
                  ))
                : HTTP_METHODS.map((method) => (
                    <button
                      key={method}
                      onClick={() => toggleMethod(method)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        filters.httpMethods.includes(method)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
            </div>
          </div>

          {/* Status Codes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status Codes</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_CODE_GROUPS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => toggleStatusCode(value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filters.statusCodes.includes(value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {uniqueStatusCodes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {uniqueStatusCodes.map((code) => (
                  <button
                    key={code}
                    onClick={() => toggleStatusCode(code)}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      filters.statusCodes.includes(code)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Size Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2 mt-1">Response Size (bytes)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                value={filters.sizeRange.min}
                onChange={(e) => updateSizeRange("min", e.target.value)}
                placeholder="Min"
                min="0"
                max={filters.sizeRange.max ? Number.parseInt(filters.sizeRange.max) || maxSize : maxSize}
                className="flex-1 min-w-0 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                value={filters.sizeRange.max}
                onChange={(e) => updateSizeRange("max", e.target.value)}
                placeholder="Max"
                min={filters.sizeRange.min ? Number.parseInt(filters.sizeRange.min) || 0 : 0}
                max={maxSize || 1000000000}
                className="flex-1 min-w-0 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {filters.sizeRange.min && filters.sizeRange.max && 
             Number.parseInt(filters.sizeRange.min) > Number.parseInt(filters.sizeRange.max) && (
              <p className="text-xs text-destructive mt-1">Max must be greater than or equal to Min</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
