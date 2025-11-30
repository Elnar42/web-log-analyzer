"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, AlertTriangle } from "lucide-react"
import { parseLogFileAsync } from "@/lib/log-parser"
import type { ParsedLogEntry } from "@/lib/types"

const MAX_ENTRIES = 1_000_000

// Helper function to format numbers consistently (prevents hydration errors)
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US')
}

interface FileUploadProps {
  onUpload: (rawData: string, parsedData: ParsedLogEntry[], errors: string[], file?: File) => Promise<void> | void
  isUploading?: boolean
  uploadProgress?: string
}

export function FileUpload({ onUpload, isUploading, uploadProgress }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "reading" | "parsing" | "uploading" | "success" | "error">(
    "idle",
  )
  const [fileName, setFileName] = useState<string>("")
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [parsedCount, setParsedCount] = useState<number>(0)
  const [errorCount, setErrorCount] = useState<number>(0)
  const [wasTruncated, setWasTruncated] = useState(false)
  const [originalCount, setOriginalCount] = useState<number>(0)
  const [parsingProgress, setParsingProgress] = useState<number>(0)

  useEffect(() => {
    if (uploadStatus === "uploading" && !isUploading) {
      setUploadStatus("success")
      let message = `Successfully loaded ${formatNumber(parsedCount)} entries`
      if (wasTruncated) {
        message += ` (truncated from ${formatNumber(originalCount)})`
      } else if (errorCount > 0) {
        message += ` (${errorCount} skipped)`
      }
      setStatusMessage(message)
    }
  }, [isUploading, uploadStatus, parsedCount, errorCount, wasTruncated, originalCount])

  const processFile = useCallback(
    async (file: File) => {
      const validTypes = [".txt", ".log"]
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()

      if (!validTypes.includes(fileExtension)) {
        setUploadStatus("error")
        setStatusMessage("Only TXT and LOG files are supported")
        return
      }

      setUploadStatus("reading")
      setFileName(file.name)
      setStatusMessage(`Reading ${file.name}...`)
      setWasTruncated(false)
      setOriginalCount(0)
      setParsingProgress(0)

      const reader = new FileReader()

      reader.onload = async (e) => {
        setUploadStatus("parsing")
        setStatusMessage("Parsing log entries... 0%")

        const content = e.target?.result as string

        const { entries, errors } = await parseLogFileAsync(content, (progress, message) => {
          setParsingProgress(progress)
          setStatusMessage(message)
        })

        let finalEntries = entries
        let truncated = false
        const totalParsedCount = entries.length

        if (entries.length > MAX_ENTRIES) {
          finalEntries = entries.slice(0, MAX_ENTRIES)
          truncated = true
          setWasTruncated(true)
          setOriginalCount(totalParsedCount)
        }

        setParsedCount(finalEntries.length)
        setErrorCount(errors.length)

        if (finalEntries.length === 0) {
          setUploadStatus("error")
          setStatusMessage("No valid log entries found. The file format may not be supported.")
          onUpload("", [], errors)
          return
        }

        setUploadStatus("uploading")
        if (truncated) {
          setStatusMessage(
            `Parsed ${formatNumber(totalParsedCount)} entries. Taking first ${formatNumber(MAX_ENTRIES)} entries. Processing...`,
          )
        } else {
          setStatusMessage(`Parsed ${formatNumber(finalEntries.length)} entries. Processing...`)
        }

        try {
          await onUpload(content, finalEntries, errors, file)

          if (!isUploading) {
            setUploadStatus("success")
            let message = `Successfully loaded ${formatNumber(finalEntries.length)} entries`
            if (truncated) {
              message += ` (truncated from ${formatNumber(totalParsedCount)})`
            } else if (errors.length > 0) {
              message += ` (${errors.length} skipped)`
            }
            setStatusMessage(message)
          }
        } catch (err) {
          setUploadStatus("error")
          setStatusMessage("Failed to process file")
        }
      }

      reader.onerror = () => {
        setUploadStatus("error")
        setStatusMessage("Failed to read file")
      }

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setStatusMessage(`Reading file... ${percentComplete}%`)
        }
      }

      reader.readAsText(file)
    },
    [onUpload, isUploading],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const isProcessing =
    uploadStatus === "reading" || uploadStatus === "parsing" || uploadStatus === "uploading" || isUploading

  const displayMessage = isUploading && uploadProgress ? uploadProgress : statusMessage

  const getStatusColor = () => {
    if (wasTruncated && uploadStatus === "success" && !isUploading) return "bg-warning/10 text-warning"
    if (uploadStatus === "success" && !isUploading) return "bg-success/10 text-success"
    if (uploadStatus === "error") return "bg-destructive/10 text-destructive"
    return "bg-primary/10 text-primary"
  }

  const getCurrentStep = () => {
    if (uploadStatus === "reading") return 1
    if (uploadStatus === "parsing") return 2
    if (uploadStatus === "uploading" || isUploading) return 3
    return 0
  }

  const currentStep = getCurrentStep()


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Upload Log File</h2>

        <p className="text-sm text-muted-foreground mb-4">
          Maximum {formatNumber(MAX_ENTRIES)} log entries will be processed. Larger files will be truncated.
        </p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
        } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept=".txt,.log"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`p-3 rounded-full ${isDragging ? "bg-primary/10" : "bg-secondary"}`}>
            {isProcessing ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <Upload className={`w-6 h-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            )}
          </div>
          <div>
            <p className="text-foreground font-medium">
              {isProcessing ? "Processing file..." : "Drop your log file here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Supports Apache and Nginx formats (.txt, .log)</p>
          </div>
        </div>
      </div>

      {(uploadStatus !== "idle" || isUploading) && (
        <div className={`mt-4 flex flex-col gap-3 p-3 rounded-lg ${getStatusColor()}`}>
          <div className="flex items-center gap-3">
            {wasTruncated && uploadStatus === "success" && !isUploading ? (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            ) : uploadStatus === "success" && !isUploading ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : uploadStatus === "error" ? (
              <AlertCircle className="w-5 h-5 shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
            )}
            <div className="flex-1 min-w-0">
              {fileName && (
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium truncate">{fileName}</span>
                </div>
              )}
              <p className="text-sm">{displayMessage}</p>
              {wasTruncated && uploadStatus === "success" && !isUploading && (
                <p className="text-xs mt-1 font-medium">
                  Warning: File exceeded {formatNumber(MAX_ENTRIES)} entries limit. Only first{" "}
                  {formatNumber(MAX_ENTRIES)} entries are loaded.
                </p>
              )}
            </div>
          </div>

          {uploadStatus === "parsing" && (
            <div className="w-full">
              <div className="w-full bg-background/50 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-150"
                  style={{ width: `${parsingProgress}%` }}
                />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded ${currentStep === 1 ? "bg-primary text-primary-foreground font-bold" : "opacity-60"}`}
              >
                1. Reading
              </span>
              <span className="opacity-40">→</span>
              <span
                className={`px-2 py-0.5 rounded ${currentStep === 2 ? "bg-primary text-primary-foreground font-bold" : "opacity-60"}`}
              >
                2. Parsing
              </span>
              <span className="opacity-40">→</span>
              <span
                className={`px-2 py-0.5 rounded ${currentStep === 3 ? "bg-primary text-primary-foreground font-bold" : "opacity-60"}`}
              >
                3. Processing
              </span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
