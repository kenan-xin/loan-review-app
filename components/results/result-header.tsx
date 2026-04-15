"use client"

import type { ResultLayout } from "./types"

interface ResultHeaderProps {
  readonly layout: ResultLayout
  readonly onLayoutChange: (layout: ResultLayout) => void
}

const LAYOUT_OPTIONS: Array<{ value: ResultLayout; label: string }> = [
  { value: "sidebar", label: "Layout A" },
  { value: "briefing", label: "Layout B" },
  { value: "ledger", label: "Layout C" },
]

export function ResultHeader({ layout, onLayoutChange }: ResultHeaderProps) {
  return (
    <div className="mb-3 flex shrink-0 items-center justify-between">
      <h2 className="text-base font-semibold">Review Results</h2>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onLayoutChange(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                layout === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <a
          href="https://forms.cloud.microsoft/r/E56ubSr1wt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:bg-blue-700 hover:shadow-lg active:scale-95"
        >
          Share Feedback →
        </a>
      </div>
    </div>
  )
}
