import type { ParsedLogEntry } from "./types"

// Apache Combined Log Format regex (with optional referrer, user-agent, response-time)
// Format: IP - - [timestamp] "method path protocol" status size "referrer" "user-agent" [response-time]
const APACHE_COMBINED_REGEX = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s*(\S*)"\s+(\d+)\s+(\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?(?:\s+(\d+))?/

// Nginx default format regex (with optional referrer, user-agent, response-time)
const NGINX_REGEX = /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s*(\S*)"\s+(\d+)\s+(\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?(?:\s+(\d+))?/

// Common Log Format regex (basic format without referrer/user-agent)
const COMMON_LOG_REGEX = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s*(\S*)"\s+(\d+)\s+(\S+)/

// CSV format detection
const CSV_HEADER_KEYWORDS = ["ip", "address", "timestamp", "date", "method", "url", "path", "status", "size", "bytes"]

export async function parseLogFileAsync(
  content: string,
  onProgress?: (progress: number, message: string) => void,
): Promise<{ entries: ParsedLogEntry[]; errors: string[] }> {
  const lines = content.split("\n").filter((line) => line.trim())
  const entries: ParsedLogEntry[] = []
  const errors: string[] = []

  if (lines.length === 0) {
    return { entries, errors: ["Empty file"] }
  }

  // Detect format - prioritize log format detection over CSV
  // Check if first line looks like a log entry (has timestamp in brackets, IP, etc.)
  const firstLine = lines[0]
  const looksLikeLog = /^\S+\s+-\s+-\s+\[/.test(firstLine) || /^\S+\s+\S+\s+\S+\s+\[/.test(firstLine)
  
  // Only detect as CSV if it doesn't look like a log AND has CSV characteristics
  const firstLineLower = firstLine.toLowerCase()
  const hasHeaderKeywords = CSV_HEADER_KEYWORDS.some((keyword) => firstLineLower.includes(keyword))
  const isCSV = !looksLikeLog && hasHeaderKeywords && firstLine.includes(",") && !firstLine.match(/\[\d{1,2}\/\w{3}\/\d{4}/)

  if (isCSV) {
    return parseCSVAsync(lines, onProgress)
  }

  // Process in chunks to prevent UI freeze
  const CHUNK_SIZE = 10000
  const totalLines = lines.length

  for (let i = 0; i < totalLines; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, totalLines)

    for (let j = i; j < end; j++) {
      const line = lines[j].trim()
      if (!line) continue

      const parsed = parseLogLine(line)
      if (parsed) {
        entries.push(parsed)
      } else {
        errors.push(`Line ${j + 1}: Unable to parse - "${line.substring(0, 80)}..."`)
      }
    }

    // Report progress and yield to main thread
    const progress = Math.round((end / totalLines) * 100)
    onProgress?.(progress, `Parsing log entries... ${progress}% (${entries.length.toLocaleString()} found)`)

    // Yield to main thread every chunk
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return { entries, errors }
}

export function parseLogFile(content: string): { entries: ParsedLogEntry[]; errors: string[] } {
  const lines = content.split("\n").filter((line) => line.trim())
  const entries: ParsedLogEntry[] = []
  const errors: string[] = []

  if (lines.length === 0) {
    return { entries, errors: ["Empty file"] }
  }

  // Detect format - prioritize log format detection over CSV
  const firstLine = lines[0]
  const looksLikeLog = /^\S+\s+-\s+-\s+\[/.test(firstLine) || /^\S+\s+\S+\s+\S+\s+\[/.test(firstLine)
  
  // Only detect as CSV if it doesn't look like a log AND has CSV characteristics
  const firstLineLower = firstLine.toLowerCase()
  const hasHeaderKeywords = CSV_HEADER_KEYWORDS.some((keyword) => firstLineLower.includes(keyword))
  const isCSV = !looksLikeLog && hasHeaderKeywords && firstLine.includes(",") && !firstLine.match(/\[\d{1,2}\/\w{3}\/\d{4}/)

  if (isCSV) {
    return parseCSV(lines)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parsed = parseLogLine(line)
    if (parsed) {
      entries.push(parsed)
    } else {
      errors.push(`Line ${i + 1}: Unable to parse - "${line.substring(0, 80)}..."`)
    }
  }

  return { entries, errors }
}

function parseLogLine(line: string): ParsedLogEntry | null {
  // Try Apache Combined format first (with referrer, user-agent, response-time)
  let match = line.match(APACHE_COMBINED_REGEX)
  if (match) {
    const [, ip, timestampStr, method, path, protocol, statusStr, sizeStr] = match
    return {
      ip,
      timestamp: parseTimestamp(timestampStr),
      method: method || "GET",
      path: path || "/",
      protocol: protocol || "HTTP/1.1",
      status: Number.parseInt(statusStr) || 0,
      size: sizeStr === "-" ? 0 : Number.parseInt(sizeStr) || 0,
      rawLine: line,
    }
  }

  // Try Nginx format
  match = line.match(NGINX_REGEX)
  if (match) {
    const [, ip, timestampStr, method, path, protocol, statusStr, sizeStr] = match
    return {
      ip,
      timestamp: parseTimestamp(timestampStr),
      method: method || "GET",
      path: path || "/",
      protocol: protocol || "HTTP/1.1",
      status: Number.parseInt(statusStr) || 0,
      size: sizeStr === "-" ? 0 : Number.parseInt(sizeStr) || 0,
      rawLine: line,
    }
  }

  // Try Common Log Format (basic)
  match = line.match(COMMON_LOG_REGEX)
  if (match) {
    const [, ip, timestampStr, method, path, protocol, statusStr, sizeStr] = match
    return {
      ip,
      timestamp: parseTimestamp(timestampStr),
      method: method || "GET",
      path: path || "/",
      protocol: protocol || "HTTP/1.1",
      status: Number.parseInt(statusStr) || 0,
      size: sizeStr === "-" ? 0 : Number.parseInt(sizeStr) || 0,
      rawLine: line,
    }
  }

  return null
}

function parseTimestamp(str: string): string | null {
  if (!str || str === "-") return null

  try {
    // Format: 15/Jul/2009:14:58:59 -0700
    const apacheMatch = str.match(/(\d{1,2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/)
    if (apacheMatch) {
      const [, day, month, year, hour, minute, second] = apacheMatch
      const monthMap: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      }
      const monthNum = monthMap[month]
      if (monthNum !== undefined) {
        const date = new Date(
          Number.parseInt(year),
          monthNum,
          Number.parseInt(day),
          Number.parseInt(hour),
          Number.parseInt(minute),
          Number.parseInt(second),
        )
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      }
    }

    if (str.includes("T") || str.includes("-")) {
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }

    // Format: 2009-07-15 14:58:59
    const isoLikeMatch = str.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/)
    if (isoLikeMatch) {
      const [, year, month, day, hour, minute, second] = isoLikeMatch
      const date = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day),
        Number.parseInt(hour),
        Number.parseInt(minute),
        Number.parseInt(second),
      )
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }

    const usDateMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
    if (usDateMatch) {
      const [, month, day, year, hour, minute, second] = usDateMatch
      const date = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day),
        Number.parseInt(hour),
        Number.parseInt(minute),
        Number.parseInt(second),
      )
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    }

    // Last resort: try native Date parsing
    const date = new Date(str)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch {
    // Ignore parsing errors
  }
  return null
}

async function parseCSVAsync(
  lines: string[],
  onProgress?: (progress: number, message: string) => void,
): Promise<{ entries: ParsedLogEntry[]; errors: string[] }> {
  const entries: ParsedLogEntry[] = []
  const errors: string[] = []

  const firstLine = lines[0]
  const delimiter = firstLine.includes("\t") ? "\t" : ","
  const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))

  const fieldMap = {
    ip: headers.findIndex((h) => h.includes("ip") || h.includes("address") || h.includes("client")),
    timestamp: headers.findIndex((h) => h.includes("time") || h.includes("date")),
    method: headers.findIndex((h) => h.includes("method") || h.includes("verb")),
    path: headers.findIndex(
      (h) => h.includes("path") || h.includes("url") || h.includes("uri") || h.includes("request"),
    ),
    status: headers.findIndex((h) => h.includes("status") || h.includes("code") || h.includes("response")),
    size: headers.findIndex((h) => h.includes("size") || h.includes("bytes") || h.includes("length")),
  }

  if (fieldMap.ip === -1 && fieldMap.path === -1) {
    errors.push("CSV does not contain recognizable log fields (ip, path, status, etc.)")
    return { entries, errors }
  }

  const CHUNK_SIZE = 10000
  const totalLines = lines.length - 1

  for (let i = 1; i < lines.length; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, lines.length)

    for (let j = i; j < end; j++) {
      const line = lines[j].trim()
      if (!line) continue

      try {
        const values = parseCSVLine(line, delimiter)

        const entry: ParsedLogEntry = {
          ip: fieldMap.ip >= 0 ? values[fieldMap.ip] || "unknown" : "unknown",
          timestamp: fieldMap.timestamp >= 0 ? parseTimestamp(values[fieldMap.timestamp]) : null,
          method: fieldMap.method >= 0 ? values[fieldMap.method] || "GET" : "GET",
          path: fieldMap.path >= 0 ? values[fieldMap.path] || "/" : "/",
          protocol: "HTTP/1.1",
          status: fieldMap.status >= 0 ? Number.parseInt(values[fieldMap.status]) || 0 : 0,
          size: fieldMap.size >= 0 ? Number.parseInt(values[fieldMap.size]) || 0 : 0,
          rawLine: line,
        }

        if (entry.ip === "unknown" && entry.path === "/" && entry.status === 0) {
          errors.push(`Line ${j + 1}: Insufficient data - "${line.substring(0, 60)}..."`)
          continue
        }

        entries.push(entry)
      } catch {
        errors.push(`Line ${j + 1}: Parse error - "${line.substring(0, 60)}..."`)
      }
    }

    const progress = Math.round(((end - 1) / totalLines) * 100)
    onProgress?.(progress, `Parsing CSV... ${progress}% (${entries.length.toLocaleString()} found)`)
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return { entries, errors }
}

function parseCSV(lines: string[]): { entries: ParsedLogEntry[]; errors: string[] } {
  const entries: ParsedLogEntry[] = []
  const errors: string[] = []

  const firstLine = lines[0]
  const delimiter = firstLine.includes("\t") ? "\t" : ","
  const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))

  const fieldMap = {
    ip: headers.findIndex((h) => h.includes("ip") || h.includes("address") || h.includes("client")),
    timestamp: headers.findIndex((h) => h.includes("time") || h.includes("date")),
    method: headers.findIndex((h) => h.includes("method") || h.includes("verb")),
    path: headers.findIndex(
      (h) => h.includes("path") || h.includes("url") || h.includes("uri") || h.includes("request"),
    ),
    status: headers.findIndex((h) => h.includes("status") || h.includes("code") || h.includes("response")),
    size: headers.findIndex((h) => h.includes("size") || h.includes("bytes") || h.includes("length")),
  }

  if (fieldMap.ip === -1 && fieldMap.path === -1) {
    errors.push("CSV does not contain recognizable log fields (ip, path, status, etc.)")
    return { entries, errors }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = parseCSVLine(line, delimiter)

      const entry: ParsedLogEntry = {
        ip: fieldMap.ip >= 0 ? values[fieldMap.ip] || "unknown" : "unknown",
        timestamp: fieldMap.timestamp >= 0 ? parseTimestamp(values[fieldMap.timestamp]) : null,
        method: fieldMap.method >= 0 ? values[fieldMap.method] || "GET" : "GET",
        path: fieldMap.path >= 0 ? values[fieldMap.path] || "/" : "/",
        protocol: "HTTP/1.1",
        status: fieldMap.status >= 0 ? Number.parseInt(values[fieldMap.status]) || 0 : 0,
        size: fieldMap.size >= 0 ? Number.parseInt(values[fieldMap.size]) || 0 : 0,
        rawLine: line,
      }

      if (entry.ip === "unknown" && entry.path === "/" && entry.status === 0) {
        errors.push(`Line ${i + 1}: Insufficient data - "${line.substring(0, 60)}..."`)
        continue
      }

      entries.push(entry)
    } catch {
      errors.push(`Line ${i + 1}: Parse error - "${line.substring(0, 60)}..."`)
    }
  }

  return { entries, errors }
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' && !inQuotes) {
      inQuotes = true
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = false
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  values.push(current.trim())

  return values
}
