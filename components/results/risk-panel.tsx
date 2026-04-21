"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { RISK_CATEGORIES, riskCategoryToId } from "@/lib/risk-framework"
import type { EvaluationRuleResult, RiskCategoryId } from "@/types/review"
import { RiskCategorySection } from "./risk-category-section"

type StatusFilter = "ALL" | "FAIL" | "WARNING" | "PASS" | "MISSING"

interface RiskPanelProps {
  readonly rules: EvaluationRuleResult[]
  readonly riskSummaries: Record<string, string>
}

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "FAIL", label: "FAIL" },
  { value: "WARNING", label: "WARN" },
  { value: "PASS", label: "PASS" },
  { value: "MISSING", label: "UNVERIFIABLE" },
]

export function RiskPanel({ rules, riskSummaries }: RiskPanelProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(["FAIL", "WARNING", "MISSING"])
  )

  const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
  for (const cat of RISK_CATEGORIES) {
    rulesByCategory[cat.id] = rules.filter(
      (r) => riskCategoryToId(r.risk_category) === cat.id
    )
  }

  const filteredTotal = rules.filter(
    (r) => activeFilters.size === 0 || activeFilters.has(r.result)
  ).length

  const toggleFilter = (value: StatusFilter) => {
    if (value === "ALL") {
      setActiveFilters(new Set())
      return
    }
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  return (
    <div role="tabpanel" className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Status filter chips */}
      <div className="flex shrink-0 items-center gap-2 border-b px-5 py-2.5">
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleFilter(opt.value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                opt.value === "ALL"
                  ? activeFilters.size === 0
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                  : activeFilters.has(opt.value)
                    ? cn("ring-1 ring-inset", {
                        "bg-red-50 text-red-600 ring-red-200":
                          opt.value === "FAIL",
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
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filteredTotal} items
        </span>
      </div>

      {/* Category sections */}
      <div className="flex-1 overflow-y-auto">
        {RISK_CATEGORIES.map((cat, catIndex) => {
          const catRules = rulesByCategory[cat.id]
          return (
            <RiskCategorySection
              key={cat.id}
              categoryId={cat.id as RiskCategoryId}
              categoryIndex={catIndex + 1}
              rules={catRules}
              activeFilters={activeFilters}
              aiSummary={riskSummaries[cat.id] ?? ""}
            />
          )
        })}
      </div>
    </div>
  )
}
