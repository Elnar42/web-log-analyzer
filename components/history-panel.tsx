"use client"

import { Clock, FileText, ChevronRight } from "lucide-react"
import type { HistoryItem } from "@/lib/types"
import { ResultsPanel } from "./results-panel"

interface HistoryPanelProps {
  history: HistoryItem[]
  selectedItem: HistoryItem | null
  onSelectItem: (item: HistoryItem | null) => void
}

export function HistoryPanel({ history, selectedItem, onSelectItem }: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No Analysis History</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Run your first analysis to see results here. History is saved for quick access to previous analyses.
        </p>
      </div>
    )
  }

  if (selectedItem) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => onSelectItem(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to History
        </button>
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <p className="text-sm text-muted-foreground">
            Analysis from {new Date(selectedItem.timestamp).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">{selectedItem.recordCount.toLocaleString()} records analyzed</p>
        </div>
        <ResultsPanel results={selectedItem.results} />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Analysis History</h2>
        <p className="text-sm text-muted-foreground">
          {history.length} previous analysis session{history.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="divide-y divide-border">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="w-full flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-secondary shrink-0">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                {item.selectedAnalyses.length} Analysis Job{item.selectedAnalyses.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.recordCount.toLocaleString()} records • {new Date(item.timestamp).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {item.selectedAnalyses.map((analysis) => (
                  <span key={analysis} className="px-2 py-0.5 bg-secondary rounded text-xs text-muted-foreground">
                    {analysis.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
