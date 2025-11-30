"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Table, Eye } from "lucide-react"
import type { ParsedLogEntry } from "@/lib/types"

interface DataPreviewProps {
  data: ParsedLogEntry[]
  totalOriginal: number
}

const ITEMS_PER_PAGE = 100

export function DataPreview({ data, totalOriginal }: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [isExpanded, setIsExpanded] = useState(true)

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, data.length)
  const currentData = data.slice(startIndex, endIndex)

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "-"
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return "-"
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-success"
    if (status >= 300 && status < 400) return "text-primary"
    if (status >= 400 && status < 500) return "text-warning"
    if (status >= 500) return "text-destructive"
    return "text-muted-foreground"
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary">
            <Table className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Data Preview</h2>
            <p className="text-sm text-muted-foreground">
              Showing {data.length.toLocaleString()} of {totalOriginal.toLocaleString()} entries
              {data.length !== totalOriginal && " (filtered)"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Eye className="w-4 h-4" />
          {isExpanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Path</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentData.map((entry, index) => (
                  <tr key={startIndex + index} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{startIndex + index + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground">{entry.ip}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{formatDate(entry.timestamp)}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium text-foreground">
                        {entry.method}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground max-w-xs truncate" title={entry.path}>
                      {entry.path}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-mono text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs font-mono">{formatSize(entry.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of {data.length.toLocaleString()} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-foreground min-w-[100px] text-center">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
