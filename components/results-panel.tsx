"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Download, Users, FileText, Clock, AlertTriangle, HardDrive } from "lucide-react"
import type { AnalysisResult } from "@/lib/types"

interface ResultsPanelProps {
  results: AnalysisResult
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function formatHourShort(hour: number): string {
  if (hour === 0) return "12a"
  if (hour === 12) return "12p"
  if (hour < 12) return `${hour}a`
  return `${hour - 12}p`
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  const [isClient, setIsClient] = useState(false)
  const [formattedDate, setFormattedDate] = useState<string>("")

  useEffect(() => {
    setIsClient(true)
    setFormattedDate(new Date(results.timestamp).toLocaleString())
  }, [results.timestamp])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [headers.join(","), ...data.map((row) => headers.map((h) => `"${row[h]}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPeakHour = () => {
    if (!results.analyses.hourlyTraffic) return null
    const sorted = [...results.analyses.hourlyTraffic].sort((a, b) => b.count - a.count)
    return sorted[0]
  }

  if (!isClient) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading results...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Analysis Results</h2>
            <p className="text-sm text-muted-foreground">
              Processed {results.filteredRecords.toLocaleString()} records
              {formattedDate && ` at ${formattedDate}`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Unique IPs */}
        {results.analyses.uniqueIps && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Unique IP Addresses</h3>
                  <p className="text-2xl font-bold text-primary">{results.analyses.uniqueIps.count.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => downloadCSV(results.analyses.uniqueIps!.topIps, "unique_ips")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Top 10 IP Addresses</p>
              <div className="space-y-2">
                {results.analyses.uniqueIps.topIps.map(({ ip, count }, i) => (
                  <div key={ip} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                    <span className="font-mono text-sm text-foreground flex-1">{ip}</span>
                    <span className="text-sm text-muted-foreground">{count.toLocaleString()} requests</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Pages */}
        {results.analyses.topPages && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <FileText className="w-4 h-4 text-success" />
                </div>
                <h3 className="font-semibold text-foreground">Top Pages</h3>
              </div>
              <button
                onClick={() => downloadCSV(results.analyses.topPages!, "top_pages")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">#</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Path</th>
                    <th className="px-4 py-2 text-right text-muted-foreground font-medium">Requests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.analyses.topPages.slice(0, 10).map(({ path, count }, i) => (
                    <tr key={path} className="hover:bg-secondary/30">
                      <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs text-foreground">{path}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hourly Traffic */}
        {results.analyses.hourlyTraffic && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Hourly Traffic Distribution</h3>
                  <p className="text-sm text-muted-foreground">
                    Shows how many requests occurred during each hour of the day
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  downloadCSV(
                    results.analyses.hourlyTraffic!.map((h) => ({
                      hour: h.hour,
                      time: formatHour(h.hour),
                      requests: h.count,
                    })),
                    "hourly_traffic",
                  )
                }
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="p-4">
              {results.analyses.hourlyTraffic.reduce((sum, h) => sum + h.count, 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No valid timestamps found in the data.</p>
                  <p className="text-sm">Timestamps may not be in a recognized format.</p>
                </div>
              ) : (
                <React.Fragment>
                  {/* Summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Requests</p>
                      <p className="text-xl font-bold text-foreground">
                        {results.analyses.hourlyTraffic.reduce((sum, h) => sum + h.count, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Peak Hour</p>
                      <p className="text-xl font-bold text-warning">
                        {getPeakHour() ? formatHour(getPeakHour()!.hour) : "-"}
                      </p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Peak Traffic</p>
                      <p className="text-xl font-bold text-foreground">
                        {getPeakHour() ? getPeakHour()!.count.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg/Hour</p>
                      <p className="text-xl font-bold text-foreground">
                        {Math.round(
                          results.analyses.hourlyTraffic.reduce((sum, h) => sum + h.count, 0) / 24,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Chart */}
                  <p className="text-xs text-muted-foreground mb-4">Traffic by hour (hover over bars for details)</p>
                  <div className="relative h-48 mb-2">
                    <div className="absolute inset-0 flex items-end gap-1">
                      {results.analyses.hourlyTraffic.map(({ hour, count }) => {
                        const maxCount = Math.max(...results.analyses.hourlyTraffic!.map((h) => h.count))
                        const chartHeight = 192
                        const barHeight =
                          maxCount > 0 ? Math.max((count / maxCount) * chartHeight, count > 0 ? 4 : 0) : 0
                        const isPeak = getPeakHour()?.hour === hour

                        return (
                          <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group">
                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                              {count.toLocaleString()}
                            </span>
                            <div
                              className={`w-full rounded-t transition-all cursor-pointer ${
                                isPeak ? "bg-warning hover:bg-warning/80" : "bg-primary/60 hover:bg-primary"
                              }`}
                              style={{ height: `${barHeight}px` }}
                              title={`${formatHour(hour)}: ${count.toLocaleString()} requests`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {results.analyses.hourlyTraffic.map(({ hour }) => (
                      <div key={hour} className="flex-1 text-center">
                        <span className="text-xs text-muted-foreground">{formatHourShort(hour)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary/60" />
                      <span className="text-xs text-muted-foreground">Regular hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-warning" />
                      <span className="text-xs text-muted-foreground">Peak hour</span>
                    </div>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        )}

        {/* Status Codes */}
        {results.analyses.statusCodes && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground">Status Code Distribution</h3>
              </div>
              <button
                onClick={() => downloadCSV(results.analyses.statusCodes!, "status_codes")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.analyses.statusCodes.map(({ status, count }) => {
                  const total = results.analyses.statusCodes!.reduce((sum, s) => sum + s.count, 0)
                  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0"
                  const colorClass =
                    status >= 200 && status < 300
                      ? "text-success"
                      : status >= 300 && status < 400
                        ? "text-primary"
                        : status >= 400 && status < 500
                          ? "text-warning"
                          : "text-destructive"

                  return (
                    <div key={status} className="p-3 bg-secondary/30 rounded-lg">
                      <p className={`text-2xl font-bold font-mono ${colorClass}`}>{status}</p>
                      <p className="text-sm text-muted-foreground">
                        {count.toLocaleString()} ({percentage}%)
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bandwidth */}
        {results.analyses.bandwidth && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HardDrive className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Bandwidth Usage</h3>
                  <div className="flex gap-4 mt-1">
                    <p className="text-sm text-muted-foreground">
                      Total:{" "}
                      <span className="text-foreground font-medium">
                        {formatBytes(results.analyses.bandwidth.totalBytes)}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Avg:{" "}
                      <span className="text-foreground font-medium">
                        {formatBytes(results.analyses.bandwidth.avgSize)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => downloadCSV(results.analyses.bandwidth!.byPath, "bandwidth")}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Top 10 Paths by Bandwidth</p>
              <div className="space-y-2">
                {results.analyses.bandwidth.byPath.map(({ path, bytes }, i) => (
                  <div key={path} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                    <span className="font-mono text-sm text-foreground flex-1 truncate">{path}</span>
                    <span className="text-sm text-muted-foreground">{formatBytes(bytes)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
