"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { RISK_CATEGORIES } from "@/lib/risk-framework"
import type {
  EvaluationRuleResult,
  RiskCategoryId,
  RiskCategorySummary,
} from "@/types/review"
import { CaDataPanel } from "./ca-data-panel"
import { RiskItem } from "./risk-item"
import { StatusFilterChips } from "./shared/status-filter-chips"
import { FindingsSection } from "./shared/findings-section"
import { CategoryStackedBar } from "./shared/category-stacked-bar"
import type { ResultLayoutProps } from "./types"

type StatusFilter = "ALL" | "FAIL" | "WARNING" | "PASS" | "MISSING"

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

function getRiskBandColor(band: string) {
  switch (band) {
    case "low":
      return "bg-emerald-100 text-emerald-800"
    case "medium":
      return "bg-amber-100 text-amber-800"
    case "high":
      return "bg-red-100 text-red-800"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

function getRowTint(summary: RiskCategorySummary) {
  if (summary.fail > 0) return "bg-red-50 dark:bg-red-950/20"
  if (summary.warning > 0) return "bg-amber-50 dark:bg-amber-950/20"
  if (summary.missing > 0 && summary.pass === 0)
    return "bg-slate-50 dark:bg-slate-800/30"
  return ""
}

function getPassRatioColor(ratio: number) {
  if (ratio >= 0.8)
    return { bg: "oklch(0.85 0.1 145)", fg: "oklch(0.3 0.08 145)" }
  if (ratio >= 0.5)
    return { bg: "oklch(0.88 0.12 85)", fg: "oklch(0.35 0.1 60)" }
  return { bg: "oklch(0.85 0.12 25)", fg: "oklch(0.3 0.1 25)" }
}

interface LedgerRowProps {
  readonly index: number
  readonly categoryId: RiskCategoryId
  readonly rules: EvaluationRuleResult[]
  readonly summary: RiskCategorySummary
  readonly aiSummary: string
  readonly activeFilters: Set<string>
}

function LedgerRow({
  index,
  categoryId,
  rules,
  summary,
  aiSummary,
  activeFilters,
}: LedgerRowProps) {
  const [open, setOpen] = useState(false)
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set())

  const cat = RISK_CATEGORIES.find((c) => c.id === categoryId)
  if (!cat) return null

  const filteredRules = rules
    .map((rule, i) => ({ rule, index: i }))
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

  const passRatio = summary.total > 0 ? summary.pass / summary.total : 0
  const ratioColor = getPassRatioColor(passRatio)

  return (
    <div
      className={cn(
        "border-oklch-[0.15_0.01_70/10] border-b",
        getRowTint(summary)
      )}
    >
      {/* Row header — separate the clickable button from the chevron */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="grid w-full grid-cols-[2rem_1fr] items-center gap-2 px-4 py-2.5 text-left md:grid-cols-[2rem_1fr_8rem_5rem_3rem]"
      >
        {/* # */}
        <span className="text-oklch-[0.15_0.01_70/35] font-[family-name:var(--font-mono-display)] text-xs font-bold tabular-nums">
          {String(index).padStart(2, "0")}
        </span>

        {/* Category */}
        <div className="min-w-0">
          <span className="text-oklch-[0.15_0.01_70] block truncate font-[family-name:var(--font-manrope)] text-sm leading-tight font-semibold">
            {cat.label}
          </span>
          {/* Mobile-only ratio */}
          <span className="text-oklch-[0.15_0.01_70/45] font-[family-name:var(--font-mono-display)] text-[10px] tabular-nums md:hidden">
            {summary.pass}/{summary.total} passed
          </span>
        </div>

        {/* Breakdown — hidden on mobile */}
        <div className="hidden items-center gap-2 md:flex">
          <CategoryStackedBar
            fail={summary.fail}
            warning={summary.warning}
            pass={summary.pass}
            missing={summary.missing}
            className="flex-1"
          />
          <span
            className="shrink-0 rounded px-1.5 py-0.5 font-[family-name:var(--font-mono-display)] text-[10px] font-semibold tabular-nums"
            style={{ background: ratioColor.bg, color: ratioColor.fg }}
          >
            {summary.pass}/{summary.total}
          </span>
        </div>

        {/* Rules count — hidden on mobile */}
        <span className="text-oklch-[0.15_0.01_70/45] hidden text-right font-[family-name:var(--font-mono-display)] text-xs tabular-nums md:block">
          {rules.length}
        </span>

        {/* Chevron — always visible */}
        <span className="flex justify-end">
          {open ? (
            <ChevronDown className="text-oklch-[0.15_0.01_70/35] size-3.5" />
          ) : (
            <ChevronRight className="text-oklch-[0.15_0.01_70/35] size-3.5" />
          )}
        </span>
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-oklch-[0.15_0.01_70/8] border-t px-4 pt-3 pb-4">
            {aiSummary && (
              <div className="bg-oklch-[0.42_0.14_65/6] mb-3 rounded p-3">
                <p className="text-oklch-[0.15_0.01_70/80] font-[family-name:var(--font-manrope)] text-xs leading-relaxed">
                  {aiSummary}
                </p>
              </div>
            )}
            {filteredRules.map(({ rule, index: ruleIdx }) => {
              const ruleKey = `${ruleIdx}:${getRuleKey(rule)}`
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
  )
}

export function LayoutLedger({
  result,
  activeTab,
  onTabChange,
}: ResultLayoutProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(["FAIL", "WARNING", "MISSING"])
  )

  const basicInfo = result.caData.A_basic_information as Record<string, unknown>
  const { evaluationSummary, evaluationDecision, evaluationResults } = result

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

  const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
  for (const cat of RISK_CATEGORIES) {
    rulesByCategory[cat.id] = evaluationResults.filter(
      (r) => r.risk_category === cat.id
    )
  }

  const filteredTotal = evaluationResults.filter(
    (r) => activeFilters.size === 0 || activeFilters.has(r.result)
  ).length

  const visibleCategories = RISK_CATEGORIES.filter((cat) => {
    const catRules = rulesByCategory[cat.id]
    if (catRules.length === 0) return false
    if (activeFilters.size === 0) return true
    return catRules.some((r) => activeFilters.has(r.result))
  })

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ background: "oklch(0.99 0.003 70)" }}
    >
      {/* Top bar */}
      <div className="border-oklch-[0.15_0.01_70/10] flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-oklch-[0.15_0.01_70] truncate font-[family-name:var(--font-manrope)] text-sm font-bold">
            {String(basicInfo.group_name ?? "Unknown Group")}
          </span>
          <span className="border-oklch-[0.15_0.01_70/18] bg-oklch-[0.15_0.01_70/5%] text-oklch-[0.15_0.01_70] shrink-0 rounded border px-1.5 py-0.5 font-[family-name:var(--font-mono-display)] text-[10px] tabular-nums">
            {String(basicInfo.ca_reference_no ?? "-")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-oklch-[0.15_0.01_70] font-[family-name:var(--font-mono-display)] text-lg font-bold tabular-nums">
            {evaluationSummary.risk_score}
          </span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold",
              getRiskBandColor(evaluationSummary.risk_band)
            )}
          >
            {evaluationSummary.risk_band}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-oklch-[0.15_0.01_70/10] flex shrink-0 border-b">
        {(["risks", "ca-data"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-5 py-2 text-xs font-medium transition-colors",
              activeTab === tab
                ? "text-oklch-[0.15_0.01_70] border-b-2"
                : "text-oklch-[0.15_0.01_70/50]"
            )}
            style={{
              borderColor:
                activeTab === tab ? "oklch(0.42 0.14 65)" : "transparent",
              fontFamily: "var(--font-manrope)",
            }}
          >
            {tab === "risks" ? "Risk Ledger" : "CA Data"}
          </button>
        ))}
      </div>

      {activeTab === "ca-data" ? (
        <CaDataPanel caData={result.caData} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            {/* Summary header */}
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_auto]">
              {/* AI Briefing */}
              <div className="bg-oklch-[0.42_0.14_65/6] rounded-lg p-4">
                <span className="text-oklch-[0.42_0.14_65] mb-2 block font-[family-name:var(--font-manrope)] text-[11px] font-semibold">
                  AI Briefing
                </span>
                <p className="text-oklch-[0.15_0.01_70/85] font-[family-name:var(--font-manrope)] text-sm leading-relaxed">
                  {evaluationDecision.reasoning}
                </p>
              </div>

              {/* Stats — compact inline row */}
              <div className="flex items-center gap-4">
                <span className="text-xs">
                  <span className="font-[family-name:var(--font-mono-display)] text-lg font-bold text-red-700 tabular-nums">
                    {evaluationSummary.total_fail}
                  </span>
                  <span className="text-oklch-[0.15_0.01_70/40] ml-1">
                    fail
                  </span>
                </span>
                <span className="text-xs">
                  <span className="font-[family-name:var(--font-mono-display)] text-lg font-bold text-amber-700 tabular-nums">
                    {evaluationSummary.total_warning}
                  </span>
                  <span className="text-oklch-[0.15_0.01_70/40] ml-1">
                    warn
                  </span>
                </span>
                <span className="text-xs">
                  <span className="font-[family-name:var(--font-mono-display)] text-lg font-bold text-emerald-700 tabular-nums">
                    {evaluationSummary.total_pass}
                  </span>
                  <span className="text-oklch-[0.15_0.01_70/40] ml-1">
                    pass
                  </span>
                </span>
                <span className="text-xs">
                  <span className="font-[family-name:var(--font-mono-display)] text-lg font-bold text-slate-500 tabular-nums">
                    {evaluationSummary.total_missing}
                  </span>
                  <span className="text-oklch-[0.15_0.01_70/40] ml-1">
                    miss
                  </span>
                </span>
              </div>
            </div>

            {/* Table header */}
            <div className="border-oklch-[0.15_0.01_70/10] text-oklch-[0.15_0.01_70/35] hidden border-b px-4 py-2 text-[10px] font-semibold tracking-wide md:grid md:grid-cols-[2rem_1fr_8rem_5rem_3rem]">
              <span className="font-[family-name:var(--font-manrope)]">#</span>
              <span className="font-[family-name:var(--font-manrope)]">
                Category
              </span>
              <span className="font-[family-name:var(--font-manrope)]">
                Breakdown
              </span>
              <span className="font-[family-name:var(--font-manrope)]">
                Ratio
              </span>
              <span className="text-right font-[family-name:var(--font-manrope)]">
                Rules
              </span>
            </div>

            {/* Filter chips */}
            <StatusFilterChips
              activeFilters={activeFilters}
              onToggle={toggleFilter}
              total={filteredTotal}
            />

            {/* Ledger rows */}
            {visibleCategories.map((cat, idx) => {
              const catSummary = evaluationSummary.by_risk_category[cat.id]
              if (!catSummary) return null
              return (
                <LedgerRow
                  key={cat.id}
                  index={idx + 1}
                  categoryId={cat.id as RiskCategoryId}
                  rules={rulesByCategory[cat.id]}
                  summary={catSummary}
                  aiSummary={evaluationSummary.risk_summaries[cat.id] ?? ""}
                  activeFilters={activeFilters}
                />
              )
            })}
            {visibleCategories.length === 0 && (
              <div className="text-oklch-[0.15_0.01_70/40] py-12 text-center text-sm">
                No matches
              </div>
            )}

            {/* Findings sections — no card wrapper */}
            <div className="px-4 pt-6 pb-8">
              <FindingsSection
                title="Key Concerns"
                items={evaluationDecision.key_concerns}
                dotColor="red"
                defaultOpen={evaluationDecision.key_concerns.length > 0}
              />
              <FindingsSection
                title="Key Strengths"
                items={evaluationDecision.key_strengths}
                dotColor="green"
              />
              <FindingsSection
                title="Required Conditions"
                items={evaluationDecision.required_conditions}
                dotColor="amber"
              />
              <FindingsSection
                title="Missing Information"
                items={evaluationDecision.missing_information}
                dotColor="grey"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
