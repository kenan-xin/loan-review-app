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

function getPassRatioColor(ratio: number) {
  if (ratio >= 0.8)
    return { bg: "oklch(0.85 0.1 145)", fg: "oklch(0.3 0.08 145)" }
  if (ratio >= 0.5)
    return { bg: "oklch(0.88 0.12 85)", fg: "oklch(0.35 0.1 60)" }
  return { bg: "oklch(0.85 0.12 25)", fg: "oklch(0.3 0.1 25)" }
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

  const passRatio = summary.total > 0 ? summary.pass / summary.total : 0
  const ratioColor = getPassRatioColor(passRatio)

  return (
    <div className="border-oklch-[0.18_0.01_60/10] border-b">
      {/* Row header — grid for predictable column widths */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-4 py-3 text-left"
      >
        <span className="text-oklch-[0.18_0.01_60] truncate font-[family-name:var(--font-serif-4)] text-sm font-medium">
          {cat.label}
        </span>
        <span className="hidden w-20 sm:block">
          <CategoryStackedBar
            fail={summary.fail}
            warning={summary.warning}
            pass={summary.pass}
            missing={summary.missing}
            className="w-full"
          />
        </span>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums"
          style={{ background: ratioColor.bg, color: ratioColor.fg }}
        >
          {summary.pass}/{summary.total}
        </span>
        <ChevronDown
          className={cn(
            "text-oklch-[0.18_0.01_60/35] size-3.5 shrink-0",
            open ? "" : "hidden"
          )}
        />
        <ChevronRight
          className={cn(
            "text-oklch-[0.18_0.01_60/35] size-3.5 shrink-0",
            open ? "hidden" : ""
          )}
        />
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-oklch-[0.18_0.01_60/6] border-t px-4 pt-3 pb-4">
            {aiSummary && (
              <div className="bg-oklch-[0.18_0.01_60/4] mb-3 rounded p-3">
                <p className="text-oklch-[0.18_0.01_60/75] font-[family-name:var(--font-serif-4)] text-xs leading-relaxed italic">
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

  const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
  for (const cat of RISK_CATEGORIES) {
    rulesByCategory[cat.id] = evaluationResults.filter(
      (r) => r.risk_category === cat.id
    )
  }

  const filteredTotal = evaluationResults.filter(
    (r) => activeFilters.size === 0 || activeFilters.has(r.result)
  ).length

  const flagCategories = RISK_CATEGORIES.filter((cat) => {
    const catSummary = evaluationSummary.by_risk_category[cat.id]
    return catSummary && (catSummary.fail > 0 || catSummary.warning > 0)
  })

  const visibleCategories = RISK_CATEGORIES.filter((cat) => {
    const catRules = rulesByCategory[cat.id]
    if (catRules.length === 0) return false
    if (activeFilters.size === 0) return true
    return catRules.some((r) => activeFilters.has(r.result))
  })

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ background: "oklch(0.98 0.005 80)" }}
    >
      {/* Tab bar */}
      <div className="border-oklch-[0.18_0.01_60/10] flex shrink-0 border-b">
        {(["risks", "ca-data"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-6 py-2.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "text-oklch-[0.18_0.01_60] border-b-2"
                : "text-oklch-[0.18_0.01_60/50]"
            )}
            style={{
              borderColor:
                activeTab === tab ? "oklch(0.45 0.12 55)" : "transparent",
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
              <h1 className="text-oklch-[0.18_0.01_60] font-[family-name:var(--font-serif-4)] text-xl leading-tight font-bold">
                {String(basicInfo.group_name ?? "Unknown Group")}
              </h1>
              <div className="text-oklch-[0.18_0.01_60/60] mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-[family-name:var(--font-sans-3)] text-xs">
                <span>CA Ref: {String(basicInfo.ca_reference_no ?? "-")}</span>
                <span>{String(basicInfo.application_type ?? "-")}</span>
              </div>
            </div>

            {/* Risk score strip */}
            <div className="border-oklch-[0.18_0.01_60/10] bg-oklch-[0.18_0.01_60/4%] border-y px-6 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="text-oklch-[0.18_0.01_60] font-mono text-2xl font-bold tabular-nums">
                  {evaluationSummary.risk_score}
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    getRiskBandColor(evaluationSummary.risk_band)
                  )}
                >
                  {evaluationSummary.risk_band}
                </span>
                <span className="bg-oklch-[0.18_0.01_60/15] h-4 w-px" />
                <span className="text-xs">
                  <span className="font-mono font-bold text-red-700">
                    {evaluationSummary.total_fail}
                  </span>{" "}
                  <span className="text-oklch-[0.18_0.01_60/50]">fail</span>
                </span>
                <span className="text-xs">
                  <span className="font-mono font-bold text-amber-700">
                    {evaluationSummary.total_warning}
                  </span>{" "}
                  <span className="text-oklch-[0.18_0.01_60/50]">warn</span>
                </span>
                <span className="text-xs">
                  <span className="font-mono font-bold text-emerald-700">
                    {evaluationSummary.total_pass}
                  </span>{" "}
                  <span className="text-oklch-[0.18_0.01_60/50]">pass</span>
                </span>
                <span className="text-xs">
                  <span className="font-mono font-bold text-slate-500">
                    {evaluationSummary.total_missing}
                  </span>{" "}
                  <span className="text-oklch-[0.18_0.01_60/50]">miss</span>
                </span>
              </div>
            </div>

            {/* AI Briefing */}
            <div className="px-6 pt-5 pb-2">
              <span className="text-oklch-[0.45_0.12_55] mb-2 block font-[family-name:var(--font-sans-3)] text-[11px] font-semibold">
                AI Briefing
              </span>
              <p className="text-oklch-[0.18_0.01_60/85] font-[family-name:var(--font-serif-4)] text-sm leading-relaxed">
                {evaluationDecision.reasoning}
              </p>
            </div>

            {/* Flagged categories */}
            {flagCategories.length > 0 && (
              <div className="px-6 pt-2 pb-1">
                <div className="flex flex-wrap gap-1.5">
                  {flagCategories.map((cat) => {
                    const catSummary =
                      evaluationSummary.by_risk_category[cat.id]
                    const hasFail = (catSummary?.fail ?? 0) > 0
                    return (
                      <span
                        key={cat.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[11px] font-medium",
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
              </div>
            )}

            {/* Category section heading */}
            <div className="px-6 pt-5 pb-2">
              <h2 className="text-oklch-[0.18_0.01_60/70] font-[family-name:var(--font-serif-4)] text-sm font-semibold">
                All 9 Risk Categories
              </h2>
            </div>

            {/* Filter chips */}
            <StatusFilterChips
              activeFilters={activeFilters}
              onToggle={toggleFilter}
              total={filteredTotal}
            />

            {/* Category list */}
            {visibleCategories.map((cat) => {
              const catSummary = evaluationSummary.by_risk_category[cat.id]
              if (!catSummary) return null
              return (
                <CategoryRow
                  key={cat.id}
                  index={RISK_CATEGORIES.indexOf(cat) + 1}
                  categoryId={cat.id as RiskCategoryId}
                  rules={rulesByCategory[cat.id]}
                  summary={catSummary}
                  aiSummary={evaluationSummary.risk_summaries[cat.id] ?? ""}
                  activeFilters={activeFilters}
                />
              )
            })}
            {visibleCategories.length === 0 && (
              <div className="text-oklch-[0.18_0.01_60/40] py-12 text-center text-sm">
                No matches
              </div>
            )}

            {/* Findings sections */}
            <div className="px-6 pt-6 pb-8">
              <h2 className="text-oklch-[0.18_0.01_60/70] mb-1 font-[family-name:var(--font-serif-4)] text-sm font-semibold">
                Key Findings
              </h2>
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
