"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
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

/* ── Colour tokens ─────────────────────────────────────── */

const LIGHT = {
  bg: "oklch(0.965 0.008 260)",
  toolbarBg: "oklch(0.94 0.01 260)",
  text: "oklch(0.15 0.02 260)",
  textStrong: "oklch(0.18 0.02 260)",
  textMuted: "oklch(0.42 0.015 260)",
  textFaint: "oklch(0.48 0.01 260)",
  accent: "oklch(0.50 0.14 185)",
  accentLight: "oklch(0.50 0.14 185 / 0.10)",
  border: "oklch(0.25 0.02 260 / 0.10)",
  surface: "oklch(0.25 0.02 260 / 0.04)",
  tabActive: "oklch(0.15 0.02 260)",
  tabInactive: "oklch(0.42 0.015 260)",
  tabLine: "oklch(0.50 0.14 185)",
  refBg: "oklch(0.25 0.02 260 / 0.06)",
  refBorder: "oklch(0.25 0.02 260 / 0.12)",
  refText: "oklch(0.50 0.14 185)",
  briefingBg: "oklch(0.50 0.14 185 / 0.07)",
  briefingLabel: "oklch(0.50 0.14 185)",
  briefingText: "oklch(0.22 0.02 260)",
  fail: "oklch(0.55 0.18 25)",
  warn: "oklch(0.62 0.16 75)",
  pass: "oklch(0.55 0.14 165)",
  miss: "oklch(0.45 0.01 260)",
  rowFail: "bg-red-50 dark:bg-red-950/20",
  rowWarn: "bg-amber-50 dark:bg-amber-950/15",
  rowEmpty: "bg-slate-50 dark:bg-slate-900/30",
}

const DARK = {
  bg: "oklch(0.14 0.02 260)",
  toolbarBg: "oklch(0.12 0.025 260)",
  text: "oklch(0.90 0.005 250)",
  textStrong: "oklch(0.93 0.005 250)",
  textMuted: "oklch(0.55 0.02 250)",
  textFaint: "oklch(0.42 0.02 250)",
  accent: "oklch(0.68 0.14 178)",
  accentLight: "oklch(0.68 0.14 178 / 0.10)",
  border: "oklch(0.30 0.02 260)",
  surface: "oklch(0.18 0.025 260)",
  tabActive: "oklch(0.90 0.005 250)",
  tabInactive: "oklch(0.48 0.02 250)",
  tabLine: "oklch(0.68 0.14 178)",
  refBg: "oklch(0.18 0.025 260)",
  refBorder: "oklch(0.30 0.02 260)",
  refText: "oklch(0.68 0.14 178)",
  briefingBg: "oklch(0.68 0.14 178 / 0.08)",
  briefingLabel: "oklch(0.68 0.14 178)",
  briefingText: "oklch(0.82 0.01 250)",
  fail: "oklch(0.65 0.18 22)",
  warn: "oklch(0.75 0.12 80)",
  pass: "oklch(0.65 0.14 165)",
  miss: "oklch(0.50 0.01 250)",
  rowFail: "bg-red-950/20",
  rowWarn: "bg-amber-950/15",
  rowEmpty: "bg-slate-900/30",
}

function useColors() {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === "dark" ? DARK : LIGHT
}

/* ── Helpers ───────────────────────────────────────────── */

function getPassRatioColor(ratio: number, c: typeof LIGHT) {
  const isDark = c === DARK
  if (ratio >= 0.8)
    return isDark
      ? { bg: "oklch(0.20 0.04 165)", fg: "oklch(0.68 0.12 178)" }
      : { bg: "oklch(0.92 0.04 185)", fg: "oklch(0.30 0.08 185)" }
  if (ratio >= 0.5)
    return isDark
      ? { bg: "oklch(0.22 0.04 80)", fg: "oklch(0.75 0.10 80)" }
      : { bg: "oklch(0.92 0.05 75)", fg: "oklch(0.32 0.06 70)" }
  return isDark
    ? { bg: "oklch(0.22 0.04 25)", fg: "oklch(0.65 0.14 22)" }
    : { bg: "oklch(0.92 0.04 25)", fg: "oklch(0.30 0.06 25)" }
}

function getRiskBandStyle(band: string, c: typeof LIGHT) {
  return getPassRatioColor(band === "low" ? 1 : band === "medium" ? 0.6 : 0, c)
}

function getRowTint(summary: RiskCategorySummary, c: typeof LIGHT) {
  if (summary.fail > 0) return c.rowFail
  if (summary.warning > 0) return c.rowWarn
  if (summary.missing > 0 && summary.pass === 0) return c.rowEmpty
  return ""
}

/* ── Ledger row ────────────────────────────────────────── */

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
  const c = useColors()
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
  const ratioColor = getPassRatioColor(passRatio, c)

  return (
    <div
      className={cn("border-b", getRowTint(summary, c))}
      style={{ borderColor: c.border }}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="grid w-full grid-cols-[2rem_1fr] items-center gap-2 px-4 py-2.5 text-left md:grid-cols-[2rem_1fr_8rem_5rem_3rem]"
      >
        <span
          className="text-xs font-bold tabular-nums"
          style={{
            fontFamily: "var(--font-mono-display)",
            color: c.textFaint,
          }}
        >
          {String(index).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          <span
            className="block truncate text-sm leading-tight font-semibold"
            style={{
              fontFamily: "var(--font-manrope)",
              color: c.text,
            }}
          >
            {cat.label}
          </span>
          <span
            className="text-[10px] tabular-nums md:hidden"
            style={{
              fontFamily: "var(--font-mono-display)",
              color: c.textFaint,
            }}
          >
            {summary.pass}/{summary.total} passed
          </span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <CategoryStackedBar
            fail={summary.fail}
            warning={summary.warning}
            pass={summary.pass}
            missing={summary.missing}
            className="flex-1"
          />
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-mono-display)",
              background: ratioColor.bg,
              color: ratioColor.fg,
            }}
          >
            {summary.pass}/{summary.total}
          </span>
        </div>

        <span
          className="hidden text-right text-xs tabular-nums md:block"
          style={{
            fontFamily: "var(--font-mono-display)",
            color: c.textFaint,
          }}
        >
          {rules.length}
        </span>

        <span className="flex justify-end">
          {open ? (
            <ChevronDown className="size-3.5" style={{ color: c.textFaint }} />
          ) : (
            <ChevronRight className="size-3.5" style={{ color: c.textFaint }} />
          )}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className="px-4 pt-3 pb-4"
            style={{ borderTop: `1px solid ${c.border}` }}
          >
            {aiSummary && (
              <div
                className="mb-3 rounded p-3"
                style={{ background: c.accentLight }}
              >
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    fontFamily: "var(--font-manrope)",
                    color: c.textMuted,
                  }}
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

/* ── Main layout ───────────────────────────────────────── */

export function LayoutLedger({
  result,
  activeTab,
  onTabChange,
}: ResultLayoutProps) {
  const c = useColors()
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

  const bandStyle = getRiskBandStyle(evaluationSummary.risk_band, c)

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ background: c.bg }}
    >
      {/* Compact toolbar */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: c.border, background: c.toolbarBg }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="truncate text-sm font-bold"
            style={{
              fontFamily: "var(--font-manrope)",
              color: c.text,
            }}
          >
            {String(basicInfo.group_name ?? "Unknown Group")}
          </span>
          <span
            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] tabular-nums"
            style={{
              fontFamily: "var(--font-mono-display)",
              background: c.refBg,
              borderColor: c.refBorder,
              color: c.refText,
            }}
          >
            {String(basicInfo.ca_reference_no ?? "-")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="text-lg font-bold tabular-nums"
            style={{
              fontFamily: "var(--font-mono-display)",
              color: c.text,
            }}
          >
            {evaluationSummary.risk_score}
          </span>
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
            style={{ background: bandStyle.bg, color: bandStyle.fg }}
          >
            {evaluationSummary.risk_band}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b" style={{ borderColor: c.border }}>
        {(["risks", "ca-data"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="px-5 py-2 text-xs font-medium transition-colors"
            style={{
              fontFamily: "var(--font-manrope)",
              borderBottom:
                activeTab === tab
                  ? `2px solid ${c.tabLine}`
                  : "2px solid transparent",
              color: activeTab === tab ? c.tabActive : c.tabInactive,
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
              <div
                className="rounded-lg p-4"
                style={{ background: c.briefingBg }}
              >
                <span
                  className="mb-2 block text-[11px] font-semibold tracking-widest uppercase"
                  style={{
                    fontFamily: "var(--font-mono-display)",
                    color: c.briefingLabel,
                  }}
                >
                  AI Briefing
                </span>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontFamily: "var(--font-manrope)",
                    color: c.briefingText,
                  }}
                >
                  {evaluationDecision.reasoning}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs">
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono-display)",
                      color: c.fail,
                    }}
                  >
                    {evaluationSummary.total_fail}
                  </span>
                  <span className="ml-1" style={{ color: c.textFaint }}>
                    fail
                  </span>
                </span>
                <span className="text-xs">
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono-display)",
                      color: c.warn,
                    }}
                  >
                    {evaluationSummary.total_warning}
                  </span>
                  <span className="ml-1" style={{ color: c.textFaint }}>
                    warn
                  </span>
                </span>
                <span className="text-xs">
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono-display)",
                      color: c.pass,
                    }}
                  >
                    {evaluationSummary.total_pass}
                  </span>
                  <span className="ml-1" style={{ color: c.textFaint }}>
                    pass
                  </span>
                </span>
                <span className="text-xs">
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono-display)",
                      color: c.miss,
                    }}
                  >
                    {evaluationSummary.total_missing}
                  </span>
                  <span className="ml-1" style={{ color: c.textFaint }}>
                    miss
                  </span>
                </span>
              </div>
            </div>

            {/* Table header */}
            <div
              className="hidden border-b px-4 py-2 text-[10px] font-semibold tracking-wide md:grid md:grid-cols-[2rem_1fr_8rem_5rem_3rem]"
              style={{
                borderColor: c.border,
                color: c.textFaint,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono-display)" }}>#</span>
              <span style={{ fontFamily: "var(--font-mono-display)" }}>
                Category
              </span>
              <span style={{ fontFamily: "var(--font-mono-display)" }}>
                Breakdown
              </span>
              <span style={{ fontFamily: "var(--font-mono-display)" }}>
                Ratio
              </span>
              <span
                className="text-right"
                style={{ fontFamily: "var(--font-mono-display)" }}
              >
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
                style={{ color: c.textFaint }}
              >
                No matches
              </div>
            )}

            {/* Findings sections */}
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
