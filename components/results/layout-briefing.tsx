"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { RISK_CATEGORIES, riskCategoryToId } from "@/lib/risk-framework"
import type {
  EvaluationRuleResult,
  RiskCategoryId,
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
  PASS: 2,
  MISSING: 3,
} as const

function getRuleKey(rule: EvaluationRuleResult) {
  return [rule.rule_title, rule.risk_category, rule.result].join("::")
}

/* ── Colour tokens ─────────────────────────────────────── */

const LIGHT = {
  bg: "oklch(0.975 0.007 78)",
  hdBg: "oklch(0.32 0.07 255)",
  hdText: "oklch(0.97 0.01 80)",
  hdSub: "oklch(0.75 0.02 255)",
  hdDot: "oklch(0.55 0.03 255)",
  hdLine: "oklch(0.65 0.14 70 / 0.45)",
  hdLabel: "oklch(0.68 0.02 255)",
  text: "oklch(0.18 0.03 255)",
  textStrong: "oklch(0.20 0.03 255 / 0.85)",
  textMuted: "oklch(0.40 0.03 255 / 0.55)",
  textFaint: "oklch(0.40 0.03 255 / 0.40)",
  accent: "oklch(0.52 0.10 65)",
  border: "oklch(0.25 0.04 255 / 0.10)",
  borderLight: "oklch(0.25 0.04 255 / 0.06)",
  surface: "oklch(0.25 0.04 255 / 0.04)",
  tabActive: "oklch(0.18 0.03 255)",
  tabInactive: "oklch(0.40 0.03 255 / 0.55)",
  tabLine: "oklch(0.52 0.10 65)",
  fail: "oklch(0.70 0.15 25)",
  warn: "oklch(0.75 0.14 75)",
  pass: "oklch(0.70 0.14 160)",
  miss: "oklch(0.55 0.01 255)",
}

const DARK = {
  bg: "oklch(0.16 0.02 255)",
  hdBg: "oklch(0.12 0.035 255)",
  hdText: "oklch(0.93 0.01 78)",
  hdSub: "oklch(0.58 0.02 255)",
  hdDot: "oklch(0.40 0.02 255)",
  hdLine: "oklch(0.65 0.12 70 / 0.45)",
  hdLabel: "oklch(0.55 0.02 255)",
  text: "oklch(0.88 0.01 255)",
  textStrong: "oklch(0.90 0.01 255)",
  textMuted: "oklch(0.58 0.02 255)",
  textFaint: "oklch(0.45 0.02 255)",
  accent: "oklch(0.62 0.12 65)",
  border: "oklch(0.35 0.02 255 / 0.15)",
  borderLight: "oklch(0.30 0.02 255 / 0.10)",
  surface: "oklch(0.20 0.03 255)",
  tabActive: "oklch(0.90 0.01 255)",
  tabInactive: "oklch(0.50 0.02 255)",
  tabLine: "oklch(0.62 0.12 65)",
  fail: "oklch(0.72 0.16 25)",
  warn: "oklch(0.78 0.14 75)",
  pass: "oklch(0.72 0.14 160)",
  miss: "oklch(0.55 0.01 250)",
}

function useColors() {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === "dark" ? DARK : LIGHT
}

/* ── Risk band / ratio helpers ─────────────────────────── */

function getRiskBandStyle(band: string, c: typeof LIGHT) {
  const isDark = c === DARK
  switch (band) {
    case "low":
      return isDark
        ? { bg: "oklch(0.20 0.04 160)", fg: "oklch(0.68 0.12 160)" }
        : { bg: "oklch(0.92 0.04 160)", fg: "oklch(0.28 0.06 160)" }
    case "medium":
      return isDark
        ? { bg: "oklch(0.22 0.04 75)", fg: "oklch(0.78 0.10 75)" }
        : { bg: "oklch(0.92 0.06 75)", fg: "oklch(0.32 0.08 65)" }
    case "high":
      return isDark
        ? { bg: "oklch(0.22 0.04 25)", fg: "oklch(0.68 0.14 22)" }
        : { bg: "oklch(0.90 0.06 25)", fg: "oklch(0.28 0.06 25)" }
    default:
      return isDark
        ? { bg: "oklch(0.20 0.02 255)", fg: "oklch(0.58 0.02 255)" }
        : { bg: "oklch(0.94 0.01 255)", fg: "oklch(0.30 0.02 255)" }
  }
}

function getPassRatioBadge(ratio: number, c: typeof LIGHT) {
  const isDark = c === DARK
  if (ratio >= 0.8)
    return isDark
      ? { bg: "oklch(0.20 0.04 160)", fg: "oklch(0.68 0.12 160)" }
      : { bg: "oklch(0.92 0.04 160)", fg: "oklch(0.28 0.06 160)" }
  if (ratio >= 0.5)
    return isDark
      ? { bg: "oklch(0.22 0.04 75)", fg: "oklch(0.78 0.10 75)" }
      : { bg: "oklch(0.92 0.06 75)", fg: "oklch(0.32 0.08 65)" }
  return isDark
    ? { bg: "oklch(0.22 0.04 25)", fg: "oklch(0.68 0.14 22)" }
    : { bg: "oklch(0.90 0.06 25)", fg: "oklch(0.28 0.06 25)" }
}

/* ── Category row ──────────────────────────────────────── */

interface CategoryRowProps {
  readonly index: number
  readonly categoryId: RiskCategoryId
  readonly rules: EvaluationRuleResult[]
  readonly catStats: { fail: number; warning: number; pass: number; missing: number }
  readonly aiSummary: string
  readonly activeFilters: Set<string>
}

function CategoryRow({
  categoryId,
  rules,
  catStats,
  aiSummary,
  activeFilters,
}: CategoryRowProps) {
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
        (RULE_STATUS_ORDER[a.rule.result as keyof typeof RULE_STATUS_ORDER] ?? 9) - (RULE_STATUS_ORDER[b.rule.result as keyof typeof RULE_STATUS_ORDER] ?? 9)
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

  const catTotal = catStats.fail + catStats.warning + catStats.pass + catStats.missing
  const passRatio = catTotal > 0 ? catStats.pass / catTotal : 0
  const badgeStyle = getPassRatioBadge(passRatio, c)

  return (
    <div className="border-b" style={{ borderColor: c.border }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-6 py-3 text-left"
      >
        <span
          className="truncate text-sm font-medium"
          style={{ fontFamily: "var(--font-serif-4)", color: c.text }}
        >
          {cat.label}
        </span>
        <span className="hidden w-20 sm:block">
          <CategoryStackedBar
            fail={catStats.fail}
            warning={catStats.warning}
            pass={catStats.pass}
            missing={catStats.missing}
            className="w-full"
          />
        </span>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={{
            fontFamily: "var(--font-mono)",
            background: badgeStyle.bg,
            color: badgeStyle.fg,
          }}
        >
          {catStats.pass}/{catTotal}
        </span>
        {open ? (
          <ChevronDown
            className="size-3.5 shrink-0"
            style={{ color: c.textMuted }}
          />
        ) : (
          <ChevronRight
            className="size-3.5 shrink-0"
            style={{ color: c.textMuted }}
          />
        )}
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div
            className="px-6 pt-3 pb-4"
            style={{ borderTop: `1px solid ${c.borderLight}` }}
          >
            {aiSummary && (
              <div
                className="mb-3 rounded p-3"
                style={{ background: c.surface }}
              >
                <p
                  className="text-xs leading-relaxed italic"
                  style={{
                    fontFamily: "var(--font-serif-4)",
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

export function LayoutBriefing({
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
      (r) => riskCategoryToId(r.risk_category) === cat.id
    )
  }

  const filteredTotal = evaluationResults.filter(
    (r) => activeFilters.size === 0 || activeFilters.has(r.result)
  ).length

  const flagCategories = RISK_CATEGORIES.filter((cat) => {
    const entry = Object.entries(evaluationSummary.by_category).find(
      ([key]) => riskCategoryToId(key) === cat.id
    )
    if (!entry) return false
    return entry[1].fail > 0 || entry[1].warning > 0
  })

  const visibleCategories = RISK_CATEGORIES.filter((cat) => {
    if (activeFilters.size === 0) return true
    const catRules = rulesByCategory[cat.id]
    return catRules.some((r) => activeFilters.has(r.result))
  })

  const bandStyle = getRiskBandStyle(result.riskBand, c)

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden"
      style={{ background: c.bg }}
    >
      {/* Dark navy header band */}
      <div className="shrink-0 px-6 pt-5 pb-4" style={{ background: c.hdBg }}>
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <div>
            <h1
              className="text-xl leading-tight font-bold"
              style={{
                fontFamily: "var(--font-serif-4)",
                color: c.hdText,
              }}
            >
              {String(basicInfo.group_name ?? "Unknown Group")}
            </h1>
            <div
              className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs"
              style={{
                fontFamily: "var(--font-sans-3)",
                color: c.hdSub,
              }}
            >
              <span>CA Ref: {String(basicInfo.ca_reference_no ?? "-")}</span>
              <span style={{ color: c.hdDot }}>·</span>
              <span>{String(basicInfo.application_type ?? "-")}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{
                fontFamily: "var(--font-mono)",
                color: c.hdText,
              }}
            >
              {result.riskScore}
            </span>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase"
              style={{ background: bandStyle.bg, color: bandStyle.fg }}
            >
              {result.riskBand}
            </span>
          </div>
        </div>
        {/* Gold line */}
        <div
          className="mx-auto mt-3 h-px max-w-3xl"
          style={{ background: c.hdLine }}
        />
        {/* Stats row */}
        <div
          className="mx-auto mt-2.5 flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-1 text-xs"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span>
            <span className="font-bold" style={{ color: c.fail }}>
              {evaluationSummary.total_fail}
            </span>{" "}
            <span style={{ color: c.hdLabel }}>fail</span>
          </span>
          <span>
            <span className="font-bold" style={{ color: c.warn }}>
              {evaluationSummary.total_warning}
            </span>{" "}
            <span style={{ color: c.hdLabel }}>warn</span>
          </span>
          <span>
            <span className="font-bold" style={{ color: c.pass }}>
              {evaluationSummary.total_pass}
            </span>{" "}
            <span style={{ color: c.hdLabel }}>pass</span>
          </span>
          <span>
            <span className="font-bold" style={{ color: c.miss }}>
              {evaluationSummary.total_missing}
            </span>{" "}
            <span style={{ color: c.hdLabel }}>miss</span>
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b" style={{ borderColor: c.border }}>
        {(["risks", "ca-data"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="px-6 py-2.5 text-xs font-medium transition-colors"
            style={{
              fontFamily: "var(--font-sans-3)",
              borderBottom:
                activeTab === tab
                  ? `2px solid ${c.tabLine}`
                  : "2px solid transparent",
              color: activeTab === tab ? c.tabActive : c.tabInactive,
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
            {/* AI Assessment */}
            <div className="px-6 pt-5 pb-2">
              <span
                className="mb-2 block text-[11px] font-semibold tracking-widest uppercase"
                style={{
                  fontFamily: "var(--font-sans-3)",
                  color: c.accent,
                }}
              >
                AI Assessment
              </span>
              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: "var(--font-serif-4)",
                  color: c.textStrong,
                }}
              >
                {evaluationDecision.reasoning}
              </p>
            </div>

            {/* Flagged categories */}
            {flagCategories.length > 0 && (
              <div className="px-6 pt-2 pb-1">
                <div className="flex flex-wrap gap-1.5">
                  {flagCategories.map((cat) => {
                    const entry = Object.entries(evaluationSummary.by_category).find(
                      ([key]) => riskCategoryToId(key) === cat.id
                    )
                    const hasFail = (entry?.[1]?.fail ?? 0) > 0
                    return (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[11px] font-medium"
                        style={{
                          background: hasFail
                            ? c === DARK
                              ? "oklch(0.22 0.04 25)"
                              : "oklch(0.92 0.04 25)"
                            : c === DARK
                              ? "oklch(0.22 0.03 75)"
                              : "oklch(0.93 0.04 75)",
                          color: hasFail
                            ? c === DARK
                              ? "oklch(0.68 0.12 22)"
                              : "oklch(0.35 0.08 25)"
                            : c === DARK
                              ? "oklch(0.75 0.10 75)"
                              : "oklch(0.35 0.06 65)",
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{
                            background: hasFail ? c.fail : c.warn,
                          }}
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
              <h2
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-serif-4)",
                  color: c.textMuted,
                }}
              >
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
              const entry = Object.entries(evaluationSummary.by_category).find(
                ([key]) => riskCategoryToId(key) === cat.id
              )
              const catStats = entry?.[1] ?? { fail: 0, warning: 0, pass: 0, missing: 0 }
              return (
                <CategoryRow
                  key={cat.id}
                  index={RISK_CATEGORIES.indexOf(cat) + 1}
                  categoryId={cat.id as RiskCategoryId}
                  rules={rulesByCategory[cat.id]}
                  catStats={catStats}
                  aiSummary={catStats.summary ?? ""}
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
            <div className="px-6 pt-6 pb-8">
              <h2
                className="mb-1 text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-serif-4)",
                  color: c.textMuted,
                }}
              >
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
