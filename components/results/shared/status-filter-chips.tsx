"use client"

import { cn } from "@/lib/utils"
import { RESULT_CONFIG } from "@/lib/risk-framework"

type StatusFilter = "ALL" | "FAIL" | "WARNING" | "PASS" | "MISSING"

interface StatusFilterChipsProps {
  readonly activeFilters: Set<string>
  readonly onToggle: (value: StatusFilter) => void
  readonly total: number
}

const STATUS_OPTIONS: Array<{
  value: StatusFilter
  key: keyof typeof RESULT_CONFIG
  label: string
}> = [
  { value: "ALL", key: "FAIL", label: "All" },
  { value: "FAIL", key: "FAIL", label: "FAIL" },
  { value: "WARNING", key: "WARNING", label: "WARN" },
  { value: "MISSING", key: "MISSING", label: "UNVERIFIABLE" },
  { value: "PASS", key: "PASS", label: "PASS" },
]

export function StatusFilterChips({
  activeFilters,
  onToggle,
  total,
}: StatusFilterChipsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b px-4 py-2">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onToggle(opt.value)}
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium transition-colors",
            opt.value === "ALL"
              ? activeFilters.size === 0
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
              : activeFilters.has(opt.value)
                ? cn("ring-1 ring-inset", {
                    "bg-red-50 text-red-600 ring-red-200": opt.value === "FAIL",
                    "bg-amber-50 text-amber-600 ring-amber-200":
                      opt.value === "WARNING",
                    "bg-emerald-50 text-emerald-600 ring-emerald-200":
                      opt.value === "PASS",
                    "bg-slate-100 text-slate-600 ring-slate-200":
                      opt.value === "MISSING",
                  })
                : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {opt.label}
        </button>
      ))}
      <span className="ml-auto font-mono text-xs text-muted-foreground">
        {total} items
      </span>
    </div>
  )
}
