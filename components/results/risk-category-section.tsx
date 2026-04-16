"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { RISK_CATEGORY_MAP } from "@/lib/risk-framework"
import type { RiskCategoryId } from "@/types/review"
import type { EvaluationRuleResult } from "@/types/review"
import { RiskItem } from "./risk-item"

const RULE_STATUS_ORDER = {
  FAIL: 0,
  WARNING: 1,
  MISSING: 2,
  PASS: 3,
  "N/A": 4,
} as const

function getRuleKey(rule: EvaluationRuleResult) {
  return [rule.rule_title, rule.category_5c, rule.result].join("::")
}

interface RiskCategorySectionProps {
  readonly categoryId: RiskCategoryId
  readonly rules: EvaluationRuleResult[]
  readonly activeFilters: Set<string>
  readonly aiSummary: string
}

export function RiskCategorySection({
  categoryId,
  rules,
  activeFilters,
  aiSummary,
}: RiskCategorySectionProps) {
  const [open, setOpen] = useState(categoryId === "management")
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set())

  const cat = RISK_CATEGORY_MAP[categoryId]
  const Icon = cat.icon

  const failCount = rules.filter((r) => r.result === "FAIL").length
  const warnCount = rules.filter((r) => r.result === "WARNING").length
  const passCount = rules.filter((r) => r.result === "PASS").length
  const totalCount = rules.length

  const filteredRules = rules
    .map((rule, index) => ({ rule, index }))
    .filter(
      ({ rule }) => activeFilters.size === 0 || activeFilters.has(rule.result)
    )
    .sort((a, b) => {
      const orderDiff =
        RULE_STATUS_ORDER[a.rule.result] - RULE_STATUS_ORDER[b.rule.result]

      return orderDiff !== 0 ? orderDiff : a.index - b.index
    })

  const toggleRule = (ruleKey: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev)
      if (next.has(ruleKey)) next.delete(ruleKey)
      else next.add(ruleKey)
      return next
    })
  }

  const countsLabel = [
    failCount > 0 ? `${failCount}F` : null,
    warnCount > 0 ? `${warnCount}W` : null,
    passCount > 0 ? `${passCount}P` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/30"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-sm font-medium">{cat.label}</span>
        {countsLabel && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {countsLabel}
          </span>
        )}
        {/* Mini stacked bar */}
        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {totalCount > 0 && (
            <div className="flex h-full">
              {failCount > 0 && (
                <div
                  className="bg-red-400"
                  style={{ width: `${(failCount / totalCount) * 100}%` }}
                />
              )}
              {warnCount > 0 && (
                <div
                  className="bg-amber-300"
                  style={{ width: `${(warnCount / totalCount) * 100}%` }}
                />
              )}
              {passCount > 0 && (
                <div
                  className="bg-emerald-400"
                  style={{
                    width: `${(passCount / totalCount) * 100}%`,
                  }}
                />
              )}
            </div>
          )}
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {totalCount}
        </span>
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4">
            {/* AI Summary block */}
            {aiSummary && (
              <div className="mb-3 rounded-lg bg-muted/40 p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    AI Summary
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {aiSummary}
                </p>
              </div>
            )}

            {/* Risk items */}
            <div>
              {filteredRules.map(({ rule, index }) => {
                const ruleKey = `${index}:${getRuleKey(rule)}`

                return (
                  <RiskItem
                    key={ruleKey}
                    rule={rule}
                    isExpanded={expandedRules.has(ruleKey)}
                    onToggle={() => toggleRule(ruleKey)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
