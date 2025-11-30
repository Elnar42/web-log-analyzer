"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Header } from "@/components/header"
import { FileUpload } from "@/components/file-upload"
import { DataPreview } from "@/components/data-preview"
import { FilterPanel } from "@/components/filter-panel"
import { AnalysisPanel } from "@/components/analysis-panel"
import { ResultsPanel } from "@/components/results-panel"
import { HistoryPanel } from "@/components/history-panel"
import type { ParsedLogEntry, FilterState, AnalysisResult, HistoryItem } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

function applyFiltersChunked(
  data: ParsedLogEntry[],
  filterState: FilterState,
  onProgress: (progress: number) => void,
  onComplete: (filtered: ParsedLogEntry[]) => void,
) {
  const CHUNK_SIZE = 50000
  const filtered: ParsedLogEntry[] = []
  let index = 0

  function processChunk() {
    const end = Math.min(index + CHUNK_SIZE, data.length)

    for (let i = index; i < end; i++) {
      const entry = data[i]
      let pass = true

      if (filterState.dateRange.start && entry.timestamp) {
        const entryDate = new Date(entry.timestamp)
        const startDate = new Date(filterState.dateRange.start)
        if (entryDate < startDate) pass = false
      }
      if (pass && filterState.dateRange.end && entry.timestamp) {
        const entryDate = new Date(entry.timestamp)
        const endDate = new Date(filterState.dateRange.end)
        if (entryDate > endDate) pass = false
      }
      if (pass && filterState.ipAddress) {
        const ipPattern = filterState.ipAddress.toLowerCase()
        if (!entry.ip.toLowerCase().includes(ipPattern)) pass = false
      }
      if (pass && filterState.urlPattern) {
        const urlPattern = filterState.urlPattern.toLowerCase()
        if (!entry.path.toLowerCase().includes(urlPattern)) pass = false
      }
      if (pass && filterState.statusCodes.length > 0) {
        const statusGroup = Math.floor(entry.status / 100) * 100
        if (!filterState.statusCodes.some((code) => code === entry.status || code === statusGroup)) pass = false
      }
      if (pass && filterState.httpMethods.length > 0) {
        if (!filterState.httpMethods.includes(entry.method)) pass = false
      }
      if (pass && filterState.sizeRange.min) {
        const minSize = Number.parseInt(filterState.sizeRange.min)
        if (entry.size < minSize) pass = false
      }
      if (pass && filterState.sizeRange.max) {
        const maxSize = Number.parseInt(filterState.sizeRange.max)
        if (entry.size > maxSize) pass = false
      }

      if (pass) filtered.push(entry)
    }

    index = end
    onProgress(Math.round((index / data.length) * 100))

    if (index < data.length) {
      setTimeout(processChunk, 0)
    } else {
      onComplete(filtered)
    }
  }

  processChunk()
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"analyze" | "history">("analyze")
  const [rawData, setRawData] = useState<string>("")
  const [parsedData, setParsedData] = useState<ParsedLogEntry[]>([])
  const [filteredData, setFilteredData] = useState<ParsedLogEntry[]>([])
  const [parsingErrors, setParsingErrors] = useState<string[]>([])
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [useBackend, setUseBackend] = useState(false)
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [isFiltering, setIsFiltering] = useState(false)
  const [filterProgress, setFilterProgress] = useState(0)
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isProcessingComplete, setIsProcessingComplete] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: "", end: "" },
    ipAddress: "",
    urlPattern: "",
    statusCodes: [],
    httpMethods: [],
    sizeRange: { min: "", max: "" },
  })
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState<string>("")

  const fetchBackendHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/results/`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data.results || [])
      }
    } catch {
      // Backend not available, using client-side only
    }
  }

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/health/`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      })
      if (response.ok) {
        setBackendStatus("connected")
        setUseBackend(true)
        fetchBackendHistory()
      } else {
        setBackendStatus("disconnected")
      }
    } catch {
      setBackendStatus("disconnected")
      setUseBackend(false)
    }
  }

  useEffect(() => {
    checkBackendStatus()
  }, [])

  const uploadToBackend = async (file: File): Promise<string | null> => {
    try {
      setUploadProgress("Preparing file for upload...")

      const formData = new FormData()
      formData.append("file", file)

      setUploadProgress("Uploading to Spark backend...")

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${API_URL}/upload/`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setUploadProgress("Upload complete! Processing on server...")
        const data = await response.json()
        setUploadProgress("")
        return data.fileId
      } else {
        let errorData
        try {
          const text = await response.text()
          errorData = text ? JSON.parse(text) : { error: 'Unknown error' }
        } catch (e) {
          errorData = { error: `Server error (${response.status})` }
        }
        console.error("Backend upload failed:", response.status, errorData)
        const errorMessage = errorData?.error || errorData?.message || 'Upload failed. Please check the file format.'
        setUploadProgress(`Upload failed: ${errorMessage}`)
        return null
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Backend upload timed out")
      } else {
        console.log("Backend upload failed:", error)
      }
      setUploadProgress("")
      return null
    }
  }

  const handleFileUpload = async (data: string, parsed: ParsedLogEntry[], errors: string[], file?: File) => {
    setIsProcessingComplete(false)
    setRawData(data)
    setParsedData(parsed)
    setFilteredData(parsed)
    setParsingErrors(errors)
    setAnalysisResults(null)

    if (useBackend && backendStatus === "connected" && file) {
      setIsUploading(true)
      const fileId = await uploadToBackend(file)
      setUploadedFileId(fileId)
      setIsUploading(false)
      setUploadProgress("")

      setIsProcessingComplete(true)

      if (!fileId) {
        console.log("Continuing with client-side processing")
      }
    } else {
      setUploadedFileId(null)
      setIsUploading(false)
      setUploadProgress("")

      setIsProcessingComplete(true)
    }
  }

  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters)

      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current)
      }

      filterTimeoutRef.current = setTimeout(() => {
        setIsFiltering(true)
        setFilterProgress(0)

        applyFiltersChunked(
          parsedData,
          newFilters,
          (progress) => setFilterProgress(progress),
          (filtered) => {
            setFilteredData(filtered)
            setIsFiltering(false)
            setFilterProgress(0)
          },
        )
      }, 300)
    },
    [parsedData],
  )

  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current)
      }
    }
  }, [])

  const runBackendAnalysis = async (selectedAnalyses: string[]): Promise<AnalysisResult | null> => {
    if (!uploadedFileId) return null

    try {
      const response = await fetch(`${API_URL}/analyze/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: uploadedFileId,
          selectedAnalyses,
          filters,
        }),
      })

      if (!response.ok) throw new Error("Analysis request failed")

      const { jobId } = await response.json()

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const statusResponse = await fetch(`${API_URL}/status/${jobId}/`)
        const statusData = await statusResponse.json()

        setAnalysisProgress(statusData.message || "Processing...")

        if (statusData.status === "completed") {
          const resultsResponse = await fetch(`${API_URL}/results/${statusData.resultId}/`)
          const resultsData = await resultsResponse.json()
          return resultsData
        } else if (statusData.status === "failed") {
          throw new Error(statusData.error || "Analysis failed")
        }
      }
    } catch (error) {
      console.log("Backend analysis failed:", error)
      return null
    }
  }

  const runClientAnalysis = async (selectedAnalyses: string[]): Promise<AnalysisResult> => {

    const results: AnalysisResult = {
      timestamp: new Date().toISOString(),
      totalRecords: parsedData.length,
      filteredRecords: filteredData.length,
      analyses: {},
    }

    if (selectedAnalyses.includes("unique-ips")) {
      const uniqueIps = new Set(filteredData.map((e) => e.ip))
      results.analyses.uniqueIps = {
        count: uniqueIps.size,
        topIps: Object.entries(
          filteredData.reduce(
            (acc, e) => {
              acc[e.ip] = (acc[e.ip] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([ip, count]) => ({ ip, count })),
      }
    }

    if (selectedAnalyses.includes("top-pages")) {
      results.analyses.topPages = Object.entries(
        filteredData.reduce(
          (acc, e) => {
            acc[e.path] = (acc[e.path] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([path, count]) => ({ path, count }))
    }

    if (selectedAnalyses.includes("hourly-traffic")) {
      const hourlyData: Record<number, number> = {}
      let validTimestamps = 0

      filteredData.forEach((e) => {
        if (e.timestamp) {
          try {
            const date = new Date(e.timestamp)
            const hour = date.getHours()
            if (!isNaN(hour) && hour >= 0 && hour <= 23) {
              hourlyData[hour] = (hourlyData[hour] || 0) + 1
              validTimestamps++
            }
          } catch {
            // Skip invalid timestamps
          }
        }
      })

      console.log("Hourly traffic analysis:", {
        totalEntries: filteredData.length,
        validTimestamps,
        hourlyData,
      })

      results.analyses.hourlyTraffic = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourlyData[i] || 0,
      }))
    }

    if (selectedAnalyses.includes("status-codes")) {
      results.analyses.statusCodes = Object.entries(
        filteredData.reduce(
          (acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1
            return acc
          },
          {} as Record<number, number>,
        ),
      )
        .sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
        .map(([status, count]) => ({ status: Number.parseInt(status), count }))
    }

    if (selectedAnalyses.includes("bandwidth")) {
      const totalBytes = filteredData.reduce((sum, e) => sum + e.size, 0)
      const avgSize = filteredData.length > 0 ? totalBytes / filteredData.length : 0

      const byPath = Object.entries(
        filteredData.reduce(
          (acc, e) => {
            acc[e.path] = (acc[e.path] || 0) + e.size
            return acc
          },
          {} as Record<string, number>,
        ),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, bytes]) => ({ path, bytes }))

      results.analyses.bandwidth = {
        totalBytes,
        avgSize,
        byPath,
      }
    }

    return results
  }

  const handleAnalysis = async (selectedAnalyses: string[]) => {
    if (selectedAnalyses.length === 0) return

    setIsAnalyzing(true)
    setAnalysisResults(null)
    setAnalysisProgress("Initializing analysis...")

    let results: AnalysisResult | null = null

    try {
      if (useBackend && uploadedFileId) {
        setAnalysisProgress("Connecting to Spark backend...")
        results = await runBackendAnalysis(selectedAnalyses)
      }

      if (!results) {
        setAnalysisProgress("Processing locally...")
        results = await runClientAnalysis(selectedAnalyses)
      }

      if (results) {
        setAnalysisResults(results)
        setAnalysisProgress("Analysis complete!")
        
        // Clear progress message after a brief delay
        setTimeout(() => setAnalysisProgress(""), 1000)

        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: results.timestamp,
          filters: { ...filters },
          selectedAnalyses,
          results,
          recordCount: filteredData.length,
        }
        setHistory((prev) => [historyItem, ...prev])
      }
    } catch (error) {
      console.error("Analysis error:", error)
      setAnalysisProgress("Analysis failed. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleViewHistory = (item: HistoryItem) => {
    setSelectedHistory(item)
    setActiveTab("history")
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                backendStatus === "connected"
                  ? "bg-green-500"
                  : backendStatus === "disconnected"
                    ? "bg-red-500"
                    : "bg-yellow-500 animate-pulse"
              }`}
            />
            <span className="text-muted-foreground">
              {backendStatus === "connected"
                ? "Spark Backend Connected"
                : backendStatus === "disconnected"
                  ? "Running Client-Side (Backend not available)"
                  : "Checking backend..."}
            </span>
          </div>
          {backendStatus === "disconnected" && (
            <button onClick={checkBackendStatus} className="text-xs text-primary hover:underline">
              Retry Connection
            </button>
          )}
        </div>

        {activeTab === "analyze" ? (
          <div className="space-y-6">
            <FileUpload onUpload={handleFileUpload} isUploading={isUploading} uploadProgress={uploadProgress} />

            {parsedData.length > 0 && isProcessingComplete && (
              <>
                {parsingErrors.length > 0 && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                    <h3 className="font-semibold text-warning mb-2">
                      Parsing Warnings ({parsingErrors.length} rows skipped)
                    </h3>
                    <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground font-mono">
                      {parsingErrors.slice(0, 5).map((error, i) => (
                        <p key={i} className="truncate">
                          {error}
                        </p>
                      ))}
                      {parsingErrors.length > 5 && (
                        <p className="text-warning">...and {parsingErrors.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}

                <DataPreview data={filteredData} totalOriginal={parsedData.length} />

                <FilterPanel
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  data={parsedData}
                  isFiltering={isFiltering}
                />

                {isFiltering && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Filtering {parsedData.length.toLocaleString()} entries...
                      </span>
                      <span className="text-sm font-medium text-primary">{filterProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-150"
                        style={{ width: `${filterProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <AnalysisPanel
                  onAnalyze={handleAnalysis}
                  isAnalyzing={isAnalyzing}
                  dataCount={filteredData.length}
                  progress={analysisProgress}
                  useBackend={useBackend}
                />

                {analysisResults && <ResultsPanel results={analysisResults} />}
              </>
            )}
          </div>
        ) : (
          <HistoryPanel history={history} selectedItem={selectedHistory} onSelectItem={setSelectedHistory} />
        )}
      </main>
    </div>
  )
}
