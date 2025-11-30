"use client"

import { useState } from "react"
import { Play, Loader2, Users, FileText, Clock, AlertTriangle, HardDrive, Sparkles } from "lucide-react"

interface AnalysisPanelProps {
  onAnalyze: (selectedAnalyses: string[]) => void
  isAnalyzing: boolean
  dataCount: number
  progress?: string
  useBackend?: boolean
}

const ANALYSIS_OPTIONS = [
  {
    id: "unique-ips",
    label: "P1: Unique IP Counter",
    description: "Count and rank unique visitor IP addresses",
    icon: Users,
  },
  {
    id: "top-pages",
    label: "P2: Top Pages Counter",
    description: "Most requested pages and resources",
    icon: FileText,
  },
  {
    id: "hourly-traffic",
    label: "P3: Hourly Traffic Counter",
    description: "Request distribution by hour of day",
    icon: Clock,
  },
  {
    id: "status-codes",
    label: "P4: Status Code Distribution",
    description: "HTTP response status code breakdown",
    icon: AlertTriangle,
  },
  {
    id: "bandwidth",
    label: "P5: Bandwidth Aggregator",
    description: "Total and per-path bandwidth usage",
    icon: HardDrive,
  },
]

export function AnalysisPanel({ onAnalyze, isAnalyzing, dataCount, progress, useBackend }: AnalysisPanelProps) {
  const [selected, setSelected] = useState<string[]>([])

  const toggleAnalysis = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const selectAll = () => setSelected(ANALYSIS_OPTIONS.map((o) => o.id))
  const clearAll = () => setSelected([])

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analysis Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Select analyses to run on {dataCount.toLocaleString()} entries
            {useBackend && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" />
                Spark
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ANALYSIS_OPTIONS.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              onClick={() => toggleAnalysis(id)}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                selected.includes(id) ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${selected.includes(id) ? "bg-primary/10" : "bg-secondary"}`}>
                <Icon className={`w-4 h-4 ${selected.includes(id) ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0">
                <p
                  className={`font-medium text-sm ${selected.includes(id) ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {selected.length} analysis job{selected.length !== 1 ? "s" : ""} selected
            </p>
            {isAnalyzing && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-xs text-primary font-medium">
                  {progress || "Analyzing data..."}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => onAnalyze(selected)}
            disabled={isAnalyzing || selected.length === 0 || dataCount === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
