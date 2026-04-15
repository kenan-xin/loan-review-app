"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react"
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

const SURFACE = "oklch(0.99 0.003 70)"
const INK = "oklch(0.15 0.01 70)"
const ACCENT = "oklch(0.42 0.14 65)"

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
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
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

  const failCount = filteredRules.filter((r) => r.rule.result === "FAIL").length
  const warnCount = filteredRules.filter(
    (r) => r.rule.result === "WARNING"
  ).length
  const summaryText =
    filteredRules.length > 0
      ? `${failCount} fail, ${warnCount} warn, ${summary.pass} pass`
      : "No matching rules"

  const passRatio = summary.total > 0 ? summary.pass / summary.total : 0
  const ratioColor = getPassRatioColor(passRatio)

  return (
    <div
      className={cn("border-b", getRowTint(summary))}
      style={{ borderColor: `${INK}12` }}
    >
      {/* Grid row: # | Category | Summary | Breakdown | Rules */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="grid w-full grid-cols-[2rem_1fr] items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.02] md:grid-cols-[2rem_1fr_1fr_7rem_4rem]"
      >
        {/* # column */}
        <span
          className="font-[family-name:var(--font-mono-display)] text-xs font-bold tabular-nums"
          style={{ color: INK, opacity: 0.35 }}
        >
          {String(index).padStart(2, "0")}
        </span>

        {/* Category column */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className="font-[family-name:var(--font-manrope)] text-sm leading-tight font-semibold"
            style={{ color: INK }}
          >
            {cat.label}
          </span>
          {/* Mobile-only: show summary below category name */}
          <span
            className="font-[family-name:var(--font-mono-display)] text-[10px] md:hidden"
            style={{ color: INK, opacity: 0.45 }}
          >
            {summary.pass}/{summary.total} passed
          </span>
        </div>

        {/* Summary column (hidden on mobile) */}
        <span
          className="hidden truncate text-xs md:block"
          style={{ color: INK, opacity: 0.55 }}
        >
          {summaryText}
        </span>

        {/* Breakdown column (hidden on mobile) */}
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

        {/* Rules count column (hidden on mobile) */}
        <span
          className="hidden text-right font-[family-name:var(--font-mono-display)] text-xs tabular-nums md:block"
          style={{ color: INK, opacity: 0.45 }}
        >
          {rules.length}
        </span>

        {/* Chevron */}
        {open ? (
          <ChevronDown
            className="col-span-2 size-3.5 shrink-0 justify-self-end md:col-span-1"
            style={{ color: INK, opacity: 0.4 }}
          />
        ) : (
          <ChevronRight
            className="col-span-2 size-3.5 shrink-0 justify-self-end md:col-span-1"
            style={{ color: INK, opacity: 0.4 }}
          />
        )}
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className="border-t px-4 pt-3 pb-4"
            style={{ borderColor: `${INK}08` }}
          >
            {aiSummary && (
              <div
                className="mb-3 rounded-md p-3"
                style={{ background: `${ACCENT}08` }}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3" style={{ color: ACCENT }} />
                  <span
                    className="font-[family-name:var(--font-manrope)] text-[10px] font-medium tracking-wide uppercase"
                    style={{ color: ACCENT }}
                  >
                    AI Category Summary
                  </span>
                </div>
                <p
                  className="font-[family-name:var(--font-manrope)] text-xs leading-relaxed"
                  style={{ color: INK, opacity: 0.8 }}
                >
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

  // Build rules by category
  const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
  for (const cat of RISK_CATEGORIES) {
    rulesByCategory[cat.id] = evaluationResults.filter(
      (r) => r.risk_category === cat.id
    )
  }

  const filteredTotal = evaluationResults.filter(
    (r) => activeFilters.size === 0 || activeFilters.has(r.result)
  ).length

  // Filtered categories based on active filters
  const visibleCategories = RISK_CATEGORIES.filter((cat) => {
    const catRules = rulesByCategory[cat.id]
    if (catRules.length === 0) return false
    if (activeFilters.size === 0) return true
    return catRules.some((r) => activeFilters.has(r.result))
  })

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ background: SURFACE }}
    >
      {/* Top bar: group name + CA ref + risk score pill */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: `${INK}12` }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="truncate font-[family-name:var(--font-manrope)] text-sm font-bold"
            style={{ color: INK }}
          >
            {String(basicInfo.group_name ?? "Unknown Group")}
          </span>
          <span
            className="shrink-0 rounded border px-1.5 py-0.5 font-[family-name:var(--font-mono-display)] text-[10px] tabular-nums"
            style={{
              borderColor: `${INK}18`,
              background: `${INK}05`,
              color: INK,
            }}
          >
            {String(basicInfo.ca_reference_no ?? "-")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="font-[family-name:var(--font-mono-display)] text-lg font-bold tabular-nums"
            style={{ color: INK }}
          >
            {evaluationSummary.risk_score}
          </span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
              getRiskBandColor(evaluationSummary.risk_band)
            )}
          >
            {evaluationSummary.risk_band}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex shrink-0 border-b"
        style={{ borderColor: `${INK}10` }}
      >
        {(["risks", "ca-data"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-5 py-2 text-xs font-medium tracking-wide uppercase transition-colors",
              activeTab === tab ? "border-b-2" : ""
            )}
            style={{
              color: activeTab === tab ? INK : `${INK}50`,
              borderColor: activeTab === tab ? ACCENT : "transparent",
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
            {/* Summary header: two columns on desktop */}
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_auto]">
              {/* AI Briefing box */}
              <div
                className="rounded-lg p-4"
                style={{ background: `${ACCENT}08` }}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-3.5" style={{ color: ACCENT }} />
                  <span
                    className="font-[family-name:var(--font-manrope)] text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: ACCENT }}
                  >
                    AI Briefing
                  </span>
                </div>
                <p
                  className="font-[family-name:var(--font-manrope)] text-sm leading-relaxed"
                  style={{ color: INK, opacity: 0.85 }}
                >
                  {evaluationDecision.reasoning}
                </p>
              </div>

              {/* 2x2 stat grid */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-2">
                {(
                  [
                    {
                      label: "FAIL",
                      value: evaluationSummary.total_fail,
                      color: "oklch(0.55 0.2 25)",
                    },
                    {
                      label: "WARN",
                      value: evaluationSummary.total_warning,
                      color: "oklch(0.7 0.15 75)",
                    },
                    {
                      label: "PASS",
                      value: evaluationSummary.total_pass,
                      color: "oklch(0.55 0.15 145)",
                    },
                    {
                      label: "MISS",
                      value: evaluationSummary.total_missing,
                      color: "oklch(0.5 0.02 260)",
                    },
                  ] as const
                ).map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center rounded-md border px-4 py-2.5"
                    style={{ borderColor: `${INK}10` }}
                  >
                    <span
                      className="font-[family-name:var(--font-mono-display)] text-xl font-bold tabular-nums"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </span>
                    <span
                      className="font-[family-name:var(--font-manrope)] text-[10px] font-medium tracking-widest uppercase"
                      style={{ color: INK, opacity: 0.4 }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ledger table header */}
            <div
              className="hidden border-b px-4 py-2 text-[10px] font-semibold tracking-widest uppercase md:grid md:grid-cols-[2rem_1fr_1fr_7rem_4rem]"
              style={{ borderColor: `${INK}12`, color: `${INK}40` }}
            >
              <span className="font-[family-name:var(--font-manrope)]">#</span>
              <span className="font-[family-name:var(--font-manrope)]">
                Category
              </span>
              <span className="font-[family-name:var(--font-manrope)]">
                Summary
              </span>
              <span className="font-[family-name:var(--font-manrope)]">
                Breakdown
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
              <div
                className="py-12 text-center text-sm"
                style={{ color: INK, opacity: 0.4 }}
              >
                No categories match the current filters.
              </div>
            )}

            {/* Findings sections */}
            <div
              className="mx-4 my-4 overflow-hidden rounded-lg border"
              style={{ borderColor: `${INK}10` }}
            >
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
