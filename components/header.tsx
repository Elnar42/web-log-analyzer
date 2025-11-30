"use client"

import { Database, History } from "lucide-react"
import { useState } from "react"

interface HeaderProps {
  activeTab: "analyze" | "history"
  onTabChange: (tab: "analyze" | "history") => void
}

function LogoImage() {
  const [logoSrc, setLogoSrc] = useState("/logo.svg")

  return (
    <img
      src={logoSrc}
      alt="WebLog Analyzer Logo"
      width={40}
      height={40}
      className="w-full h-full object-contain"
      onError={() => {
        if (logoSrc !== "/icon.svg") {
          setLogoSrc("/icon.svg")
        }
      }}
    />
  )
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0 overflow-hidden">
              <LogoImage />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">WebLog Analyzer</h1>
              <p className="text-xs text-muted-foreground">Upload your logs and analyze them with Apache Spark</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => onTabChange("analyze")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "analyze"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="w-4 h-4" />
              Analyze
            </button>
            <button
              onClick={() => onTabChange("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
