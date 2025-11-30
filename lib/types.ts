export interface ParsedLogEntry {
  ip: string
  timestamp: string | null
  method: string
  path: string
  protocol: string
  status: number
  size: number
  rawLine: string
}

export interface FilterState {
  dateRange: {
    start: string
    end: string
  }
  ipAddress: string
  urlPattern: string
  statusCodes: number[]
  httpMethods: string[]
  sizeRange: {
    min: string
    max: string
  }
}

export interface AnalysisResult {
  timestamp: string
  totalRecords: number
  filteredRecords: number
  analyses: {
    uniqueIps?: {
      count: number
      topIps: { ip: string; count: number }[]
    }
    topPages?: { path: string; count: number }[]
    hourlyTraffic?: { hour: number; count: number }[]
    statusCodes?: { status: number; count: number }[]
    bandwidth?: {
      totalBytes: number
      avgSize: number
      byPath: { path: string; bytes: number }[]
    }
  }
}

export interface HistoryItem {
  id: string
  timestamp: string
  filters: FilterState
  selectedAnalyses: string[]
  results: AnalysisResult
  recordCount: number
}
