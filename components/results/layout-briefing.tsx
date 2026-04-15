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

const PAPER = "oklch(0.98 0.005 80)"
const INK = "oklch(0.18 0.01 60)"
const ACCENT = "oklch(0.45 0.12 55)"
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

function StatPill({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-lg font-bold" style={{ color: INK }}>
        {value}
      </span>
      <span className="text-[10px] tracking-wider uppercase" style={{ color }}>
        {label}
      </span>
    </div>
  )
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-6 pb-3">
      <div className="h-px flex-1" style={{ background: INK, opacity: 0.15 }} />
      <span
        className="font-[family-name:var(--font-serif-4)] text-xs font-semibold tracking-widest uppercase"
        style={{ color: INK, opacity: 0.5 }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: INK, opacity: 0.15 }} />
    </div>
  )
}

interface CategoryRowProps {
  readonly index: number
  readonly categoryId: RiskCategoryId
  readonly rules: EvaluationRuleResult[]
  readonly summary: RiskCategorySummary
  readonly aiSummary: string
  readonly activeFilters: Set<string>
}

function CategoryRow({
  index,
  categoryId,
  rules,
  summary,
  aiSummary,
  activeFilters,
}: CategoryRowProps) {
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

  const oneLineSummary =
    filteredRules.length > 0
      ? filteredRules
          .slice(0, 3)
          .map((r) => r.rule.result)
          .reduce(
            (acc, status) => {
              acc[status] = (acc[status] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )
      : null

  const summaryParts = oneLineSummary
    ? Object.entries(oneLineSummary)
        .map(([status, count]) => `${count} ${status}`)
        .join(", ")
    : "No rules"

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: `${INK}12` }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
      >
        <span
          className="w-5 shrink-0 text-center font-mono text-xs font-bold"
          style={{ color: INK, opacity: 0.3 }}
        >
          {index}
        </span>
        <span
          className="min-w-0 flex-1 font-[family-name:var(--font-serif-4)] text-sm font-medium"
          style={{ color: INK }}
        >
          {cat.label}
        </span>
        <span
          className="hidden max-w-[200px] truncate text-[11px] sm:inline"
          style={{ color: INK, opacity: 0.5 }}
        >
          {summaryParts}
        </span>
        <div className="hidden w-20 sm:block">
          <CategoryStackedBar
            fail={summary.fail}
            warning={summary.warning}
            pass={summary.pass}
            missing={summary.missing}
            className="w-full"
          />
        </div>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
          style={{
            background:
              summary.pass / summary.total >= 0.8
                ? "oklch(0.85 0.1 145)"
                : summary.pass / summary.total >= 0.5
                  ? "oklch(0.88 0.12 85)"
                  : "oklch(0.85 0.12 25)",
            color:
              summary.pass / summary.total >= 0.8
                ? "oklch(0.3 0.08 145)"
                : summary.pass / summary.total >= 0.5
                  ? "oklch(0.35 0.1 60)"
                  : "oklch(0.3 0.1 25)",
          }}
        >
          {summary.pass}/{summary.total}
        </span>
        {open ? (
          <ChevronDown
            className="size-3.5 shrink-0"
            style={{ color: INK, opacity: 0.4 }}
          />
        ) : (
          <ChevronRight
            className="size-3.5 shrink-0"
            style={{ color: INK, opacity: 0.4 }}
          />
        )}
      </button>
      {filteredRules.length > 0 && (
        <div className="px-4 pb-1.5">
          <span
            className="text-[10px] underline decoration-dotted underline-offset-2"
            style={{ color: INK, opacity: 0.35 }}
          >
            Click to expand {filteredRules.length} rule
            {filteredRules.length !== 1 && "s"}
          </span>
        </div>
      )}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            {aiSummary && (
              <div
                className="mb-3 rounded-lg p-3"
                style={{ background: `${INK}06` }}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3" style={{ color: ACCENT }} />
                  <span
                    className="text-[10px] font-medium tracking-wide uppercase"
                    style={{ color: ACCENT }}
                  >
                    AI Summary
                  </span>
                </div>
                <p
                  className="font-[family-name:var(--font-serif-4)] text-xs leading-relaxed italic"
                  style={{ color: INK, opacity: 0.75 }}
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

export function LayoutBriefing({
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

  // Flag categories: those with any FAIL or WARNING rules
  const flagCategories = RISK_CATEGORIES.filter((cat) => {
    const catSummary = evaluationSummary.by_risk_category[cat.id]
    return catSummary && (catSummary.fail > 0 || catSummary.warning > 0)
  })

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
      style={{ background: PAPER }}
    >
      {/* Tab bar */}
      <div
        className="flex shrink-0 border-b"
        style={{ background: PAPER, borderColor: `${INK}12` }}
      >
        {(["risks", "ca-data"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-6 py-2.5 text-xs font-medium tracking-wide uppercase transition-colors",
              activeTab === tab ? "border-b-2" : ""
            )}
            style={{
              color: activeTab === tab ? INK : `${INK}60`,
              borderColor: activeTab === tab ? ACCENT : "transparent",
              fontFamily: "var(--font-sans-3)",
            }}
          >
            {tab === "risks" ? "Risk Assessment" : "CA Data"}
          </button>
        ))}
      </div>

      {activeTab === "ca-data" ? (
        <CaDataPanel caData={result.caData} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl">
            {/* Masthead */}
            <div className="px-6 pt-6 pb-4">
              <h1
                className="font-[family-name:var(--font-serif-4)] text-xl leading-tight font-bold"
                style={{ color: INK }}
              >
                {String(basicInfo.group_name ?? "Unknown Group")}
              </h1>
              <div
                className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-[family-name:var(--font-sans-3)] text-xs"
                style={{ color: INK, opacity: 0.6 }}
              >
                <span>CA Ref: {String(basicInfo.ca_reference_no ?? "-")}</span>
                <span>{String(basicInfo.application_type ?? "-")}</span>
              </div>
            </div>

            {/* Risk score strip */}
            <div
              className="mx-6 flex flex-wrap items-center gap-6 rounded-lg px-5 py-4"
              style={{ background: `${INK}06`, border: `1px solid ${INK}10` }}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="font-mono text-3xl font-bold"
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
              <div className="h-8 w-px" style={{ background: `${INK}15` }} />
              <StatPill
                label="Fail"
                value={evaluationSummary.total_fail}
                color="oklch(0.55 0.2 25)"
              />
              <StatPill
                label="Warn"
                value={evaluationSummary.total_warning}
                color="oklch(0.7 0.15 75)"
              />
              <StatPill
                label="Pass"
                value={evaluationSummary.total_pass}
                color="oklch(0.55 0.15 145)"
              />
              <StatPill
                label="Miss"
                value={evaluationSummary.total_missing}
                color="oklch(0.5 0.02 260)"
              />
            </div>

            {/* AI Briefing */}
            <div className="px-6 pt-5 pb-2">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="size-3.5" style={{ color: ACCENT }} />
                <span
                  className="text-[10px] font-medium tracking-widest uppercase"
                  style={{ color: ACCENT }}
                >
                  AI Briefing
                </span>
              </div>
              <div
                className="font-[family-name:var(--font-serif-4)] text-sm leading-relaxed"
                style={{ color: INK, opacity: 0.85 }}
              >
                {evaluationDecision.reasoning}
              </div>
            </div>

            {/* Categories Requiring Attention */}
            {flagCategories.length > 0 && (
              <>
                <div className="px-6">
                  <SectionDivider>
                    Categories Requiring Attention
                  </SectionDivider>
                </div>
                <div className="flex flex-wrap gap-2 px-6 pb-2">
                  {flagCategories.map((cat) => {
                    const catSummary =
                      evaluationSummary.by_risk_category[cat.id]
                    const hasFail = (catSummary?.fail ?? 0) > 0
                    return (
                      <span
                        key={cat.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium",
                          hasFail
                            ? "bg-red-50 text-red-800"
                            : "bg-amber-50 text-amber-800"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            hasFail ? "bg-red-500" : "bg-amber-400"
                          )}
                        />
                        {cat.label}
                      </span>
                    )
                  })}
                </div>
              </>
            )}

            {/* All 9 Risk Categories */}
            <div className="px-6">
              <SectionDivider>All 9 Risk Categories</SectionDivider>
            </div>

            {/* Filter chips */}
            <div className="px-6">
              <StatusFilterChips
                activeFilters={activeFilters}
                onToggle={toggleFilter}
                total={filteredTotal}
              />
            </div>

            {/* Category grid: single column on mobile, two on tablet, single on desktop */}
            <div className="px-6">
              <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                {visibleCategories.map((cat, idx) => {
                  const catSummary = evaluationSummary.by_risk_category[cat.id]
                  if (!catSummary) return null
                  return (
                    <CategoryRow
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
              </div>
              {visibleCategories.length === 0 && (
                <div
                  className="py-12 text-center text-sm"
                  style={{ color: INK, opacity: 0.4 }}
                >
                  No categories match the current filters.
                </div>
              )}
            </div>

            {/* Findings sections */}
            <div className="px-6 pt-4 pb-8">
              <SectionDivider>Key Findings</SectionDivider>

              <div
                className="overflow-hidden rounded-lg border"
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
        </div>
      )}
    </div>
  )
}
