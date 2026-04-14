"use client"

import { useState } from "react"
import type { SimulationResult } from "@/types/review"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"

interface ResultsStepProps {
  readonly result: SimulationResult
  readonly onStartNew: () => void
}

type RuleFilter = "ALL" | "FAIL" | "WARNING" | "PASS" | "MISSING"

const RESULT_CONFIG = {
  FAIL: {
    label: "FAIL",
    borderColor: "border-l-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    barColor: "bg-red-500",
    statColor: "text-red-600 dark:text-red-400",
  },
  WARNING: {
    label: "WARN",
    borderColor: "border-l-amber-400",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    barColor: "bg-amber-400",
    statColor: "text-amber-600 dark:text-amber-400",
  },
  PASS: {
    label: "PASS",
    borderColor: "border-l-emerald-500",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    barColor: "bg-emerald-500",
    statColor: "text-emerald-600 dark:text-emerald-400",
  },
  MISSING: {
    label: "MISS",
    borderColor: "border-l-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    barColor: "bg-slate-300 dark:bg-slate-600",
    statColor: "text-slate-600 dark:text-slate-400",
  },
  "N/A": {
    label: "N/A",
    borderColor: "border-l-slate-300",
    badge:
      "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500",
    barColor: "bg-slate-200 dark:bg-slate-700",
    statColor: "text-slate-500 dark:text-slate-500",
  },
} as const

const CATEGORIES = [
  "Character",
  "Capacity",
  "Capital",
  "Collateral",
  "Conditions",
]

function LeftSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
      >
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
          {count !== undefined && (
            <span className="ml-1.5 font-mono text-foreground">{count}</span>
          )}
        </span>
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-3">{children}</div>
        </div>
      </div>
    </div>
  )
}

function CaSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <span className="text-sm font-medium">{title}</span>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(value: unknown): string {
  if (typeof value === "number") {
    return `RM ${value.toLocaleString()}K`
  }
  return String(value ?? "-")
}

function formatMultiple(value: unknown): string {
  if (typeof value === "number") {
    return `${value}x`
  }
  return String(value ?? "-")
}

export function ResultsStep({ result, onStartNew }: ResultsStepProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "ca-data" | "risks">(
    "ca-data"
  )
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set())

  const { caData, evaluationResults, evaluationSummary, evaluationDecision } =
    result

  const uniqueConcerns = [...new Set(evaluationDecision.key_concerns)]
  const uniqueStrengths = [...new Set(evaluationDecision.key_strengths)]

  const filteredRules = evaluationResults.filter((r) => {
    if (ruleFilter !== "ALL" && r.result !== ruleFilter) return false
    if (categoryFilter !== "ALL" && r.category_5c !== categoryFilter)
      return false
    return true
  })

  const toggleRule = (idx: number) => {
    setExpandedRules((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const basicInfo = caData.A_basic_information as Record<string, unknown>
  const borrowerProfile = caData.B_borrower_profile as Record<string, unknown>
  const facilities = caData.E_facilities as Record<string, unknown>
  const securities = caData.F_securities as Record<string, unknown>
  const groupExposure = caData.G_group_exposure as Record<string, unknown>
  const financialSummaries = caData.I_financial_summaries as Record<
    string,
    unknown
  >[]
  const keyCreditIssues = caData.K_key_credit_issues as Record<
    string,
    unknown
  >[]
  const termsAndConditions = caData.M_terms_and_conditions as Record<
    string,
    unknown
  >
  const mccDecision = caData.N_mcc_decision as Record<string, unknown>
  const applicationRequests = caData.O_application_requests as Record<
    string,
    unknown
  >[]

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h2 className="text-base font-semibold">Review Results</h2>
        <a
          href="https://forms.cloud.microsoft/r/E56ubSr1wt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:bg-blue-700 hover:shadow-lg active:scale-95"
        >
          Share Feedback →
        </a>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[360px_1fr]">
        {/* Left panel */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border lg:max-h-full">
          {/* Decision banner */}
          <div className="shrink-0 bg-primary px-4 py-4 text-primary-foreground">
            <div className="text-2xl font-bold tracking-tight">
              {basicInfo.group_name as string}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs opacity-75">
              <span>{basicInfo.ca_reference_no as string}</span>
              <span>·</span>
              <span>{basicInfo.application_type as string}</span>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid shrink-0 grid-cols-4 border-b">
            {(["FAIL", "WARNING", "PASS", "MISSING"] as const).map((type) => {
              const count =
                type === "FAIL"
                  ? evaluationSummary.total_fail
                  : type === "WARNING"
                    ? evaluationSummary.total_warning
                    : type === "PASS"
                      ? evaluationSummary.total_pass
                      : evaluationSummary.total_missing
              const cfg = RESULT_CONFIG[type]
              return (
                <div
                  key={type}
                  className="flex flex-col items-center border-r py-2.5 last:border-r-0"
                >
                  <span
                    className={cn("font-mono text-xl font-bold", cfg.statColor)}
                  >
                    {count}
                  </span>
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Scrollable left content */}
          <div className="flex-1 overflow-y-auto">
            {/* 5C category bars */}
            <div className="border-b px-4 py-3">
              <div className="mb-2.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                5C Categories
              </div>
              <div className="space-y-2.5">
                {CATEGORIES.map((cat) => {
                  const stats = evaluationSummary.by_category[cat] ?? {
                    pass: 0,
                    warning: 0,
                    fail: 0,
                    missing: 0,
                  }
                  const total =
                    stats.pass + stats.warning + stats.fail + stats.missing
                  if (total === 0) return null
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-foreground">{cat}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {stats.fail}F · {stats.warning}W · {stats.pass}P
                        </span>
                      </div>
                      <div className="flex h-1.5 gap-px overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        {stats.fail > 0 && (
                          <div
                            className="bg-red-500"
                            style={{
                              width: `${(stats.fail / total) * 100}%`,
                            }}
                          />
                        )}
                        {stats.warning > 0 && (
                          <div
                            className="bg-amber-400"
                            style={{
                              width: `${(stats.warning / total) * 100}%`,
                            }}
                          />
                        )}
                        {stats.pass > 0 && (
                          <div
                            className="bg-emerald-500"
                            style={{
                              width: `${(stats.pass / total) * 100}%`,
                            }}
                          />
                        )}
                        {stats.missing > 0 && (
                          <div
                            className="bg-slate-300 dark:bg-slate-600"
                            style={{
                              width: `${(stats.missing / total) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <LeftSection
              title="Key Concerns"
              count={uniqueConcerns.length}
              defaultOpen
            >
              <ul className="space-y-1.5">
                {uniqueConcerns.map((concern, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0 text-red-500">•</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </LeftSection>

            <LeftSection
              title="Key Strengths"
              count={uniqueStrengths.length}
              defaultOpen={false}
            >
              <ul className="space-y-1.5">
                {uniqueStrengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0 text-emerald-500">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </LeftSection>

            {evaluationDecision.required_conditions.length > 0 && (
              <LeftSection
                title="Required Conditions"
                count={evaluationDecision.required_conditions.length}
                defaultOpen={false}
              >
                <ul className="space-y-2">
                  {evaluationDecision.required_conditions.map((cond, idx) => (
                    <li
                      key={idx}
                      className="border-l-2 border-amber-400 pl-2.5 text-xs leading-relaxed"
                    >
                      {cond}
                    </li>
                  ))}
                </ul>
              </LeftSection>
            )}

            {evaluationDecision.missing_information.length > 0 && (
              <LeftSection
                title="Missing Information"
                count={evaluationDecision.missing_information.length}
                defaultOpen={false}
              >
                <ul className="space-y-2">
                  {evaluationDecision.missing_information.map((item, idx) => (
                    <li
                      key={idx}
                      className="border-l-2 border-slate-300 pl-2.5 text-xs leading-relaxed text-muted-foreground dark:border-slate-600"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </LeftSection>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
          {/* Tab bar */}
          <div role="tablist" className="flex shrink-0 border-b">
            {(["ca-data", "risks", "rules"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "rules"
                  ? "Rules"
                  : tab === "risks"
                    ? "Risks"
                    : "CA Data"}
              </button>
            ))}
          </div>

          {/* Rules tab */}
          {activeTab === "rules" && (
            <div role="tabpanel" className="flex min-h-0 flex-1 flex-col">
              {/* Filter bar */}
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
                <div className="flex items-center gap-1">
                  {(["ALL", "FAIL", "WARNING", "PASS", "MISSING"] as const).map(
                    (f) => (
                      <button
                        key={f}
                        onClick={() => setRuleFilter(f)}
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                          ruleFilter === f
                            ? f === "ALL"
                              ? "bg-foreground text-background"
                              : cn("text-white", {
                                  "bg-red-500": f === "FAIL",
                                  "bg-amber-400 text-white": f === "WARNING",
                                  "bg-emerald-500": f === "PASS",
                                  "bg-slate-500": f === "MISSING",
                                })
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {f === "ALL" ? "All" : f === "WARNING" ? "WARN" : f}
                      </button>
                    )
                  )}
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCategoryFilter("ALL")}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                      categoryFilter === "ALL"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    All 5C
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                        categoryFilter === cat
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {cat.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {filteredRules.length} rules
                </span>
              </div>

              {/* Rule rows */}
              <div className="flex-1 overflow-y-auto">
                {filteredRules.map((rule, idx) => {
                  const cfg = RESULT_CONFIG[rule.result]
                  const isExpanded = expandedRules.has(idx)
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "border-b border-l-2 border-border last:border-b-0",
                        cfg.borderColor
                      )}
                    >
                      <button
                        onClick={() => toggleRule(idx)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                                cfg.badge
                              )}
                            >
                              {cfg.label}
                            </span>
                            <span className="truncate text-[10px] text-muted-foreground">
                              {rule.category_5c}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            {rule.rule_title}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows] duration-200 ease-out",
                          isExpanded
                            ? "[grid-template-rows:1fr]"
                            : "[grid-template-rows:0fr]"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="px-3 pt-0 pb-3">
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {rule.explanation}
                            </p>
                            {rule.action && (
                              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                                  Action
                                </span>
                                <p className="mt-0.5 text-xs text-foreground">
                                  {rule.action}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CA Data tab */}
          {activeTab === "ca-data" && (
            <div role="tabpanel" className="flex-1 overflow-y-auto">
              <CaSection title="Basic Information" defaultOpen>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="text-muted-foreground">Group Name</div>
                  <div>{(basicInfo.group_name as string) || "-"}</div>
                  <div className="text-muted-foreground">Borrower(s)</div>
                  <div>
                    {Array.isArray(basicInfo.borrower_names)
                      ? (basicInfo.borrower_names as string[]).join(", ")
                      : "-"}
                  </div>
                  <div className="text-muted-foreground">CA Reference</div>
                  <div>{(basicInfo.ca_reference_no as string) || "-"}</div>
                  <div className="text-muted-foreground">CA Date</div>
                  <div>{(basicInfo.ca_date as string) || "-"}</div>
                  <div className="text-muted-foreground">Application Type</div>
                  <div>{(basicInfo.application_type as string) || "-"}</div>
                  <div className="text-muted-foreground">Account Status</div>
                  <div>{(basicInfo.account_status as string) || "-"}</div>
                  <div className="text-muted-foreground">
                    Relationship Since
                  </div>
                  <div>{(basicInfo.relationship_since as string) || "-"}</div>
                  <div className="text-muted-foreground">
                    Relationship Strategy
                  </div>
                  <div>
                    {(basicInfo.relationship_strategy as string) || "-"}
                  </div>
                  <div className="text-muted-foreground">
                    Next Review Expiry
                  </div>
                  <div>{(basicInfo.next_review_expiry as string) || "-"}</div>
                </div>
              </CaSection>

              <CaSection title="Borrower Profile">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="text-muted-foreground">
                    Principal Activity
                  </div>
                  <div>
                    {(borrowerProfile.principal_activity as string) || "-"}
                  </div>
                  <div className="text-muted-foreground">Industry Sector</div>
                  <div>
                    {(borrowerProfile.industry_sector as string) || "-"}
                  </div>
                  <div className="text-muted-foreground">Year Commenced</div>
                  <div>{(borrowerProfile.year_commenced as number) || "-"}</div>
                  <div className="text-muted-foreground">SME</div>
                  <div>{String(borrowerProfile.is_sme) || "-"}</div>
                  <div className="text-muted-foreground">CRR Existing</div>
                  <div>{(borrowerProfile.crr_existing as string) || "-"}</div>
                  <div className="text-muted-foreground">CRR Proposed</div>
                  <div>{(borrowerProfile.crr_proposed as string) || "-"}</div>
                  <div className="text-muted-foreground">ESG Rating</div>
                  <div>
                    {(borrowerProfile.esg_rating_proposed as string) || "-"}
                  </div>
                  <div className="text-muted-foreground">
                    BNM Classification
                  </div>
                  <div>
                    {(borrowerProfile.bnm_classification_proposed as string) ||
                      "-"}
                  </div>
                </div>
              </CaSection>

              <CaSection title="Application Requests">
                {applicationRequests.map((req, idx) => (
                  <div key={idx} className="mb-3 last:mb-0">
                    <div className="mb-1 text-xs font-medium">
                      Request {idx + 1}: {req.request_type as string}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.description as string}
                    </p>
                  </div>
                ))}
              </CaSection>

              <CaSection title="Facilities">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 border-b pb-2 text-xs font-medium">
                    <div>Facility</div>
                    <div className="text-right">Limit (RM)</div>
                    <div className="text-right">Outstanding (RM)</div>
                  </div>
                  {(
                    facilities.facility_items as Record<string, unknown>[]
                  )?.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="font-medium">
                          {item.facility_label as string}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.facility_type as string}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        {formatCurrency(item.total_limit_rm)}
                      </div>
                      <div className="text-right font-mono">
                        {formatCurrency(item.outstanding_rm)}
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 border-t pt-2 text-xs font-medium">
                    <div>Total</div>
                    <div className="text-right font-mono">
                      {formatCurrency(facilities.total_proposed_rm)}
                    </div>
                    <div className="text-right font-mono">
                      {formatCurrency(facilities.total_outstanding_rm)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 border-t pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Secured</span>
                    <span className="font-mono">
                      {formatCurrency(facilities.total_security_value_rm)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Unsecured
                    </span>
                    <span className="font-mono">
                      {formatCurrency(facilities.total_unsecured_rm)}
                    </span>
                  </div>
                </div>
              </CaSection>

              <CaSection title="Securities">
                <div className="space-y-2">
                  {(
                    securities.security_items as Record<string, unknown>[]
                  )?.map((item, idx) => (
                    <div key={idx} className="rounded bg-muted/30 p-2 text-xs">
                      <div className="flex items-start justify-between">
                        <span className="font-medium">
                          {item.security_type as string}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {item.security_status as string}
                        </span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {item.description as string}
                      </p>
                      {typeof item.secured_against_facility === "string" &&
                        item.secured_against_facility && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            Secured against: {item.secured_against_facility}
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              </CaSection>

              <CaSection title="Group Exposure">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="text-muted-foreground">Grand Total</div>
                  <div className="font-mono font-medium">
                    {formatCurrency(groupExposure.grand_total_rm)}
                  </div>
                  <div className="text-muted-foreground">Secured Exposure</div>
                  <div className="font-mono">
                    {formatCurrency(groupExposure.secured_exposure_rm)}
                  </div>
                  <div className="text-muted-foreground">
                    Unsecured Exposure
                  </div>
                  <div className="font-mono">
                    {formatCurrency(groupExposure.unsecured_exposure_rm)}
                  </div>
                  <div className="text-muted-foreground">Total FEC/CCS/IRS</div>
                  <div className="font-mono">
                    {formatCurrency(groupExposure.total_fec_ccs_irs_rm)}
                  </div>
                </div>
              </CaSection>

              <CaSection title="Financial Summary">
                {financialSummaries?.map((entity, idx) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    <div className="mb-2 flex items-center justify-between text-xs font-medium">
                      <span>{entity.entity_name as string}</span>
                      <span className="font-normal text-muted-foreground">
                        {entity.entity_role as string}
                      </span>
                    </div>
                    {(entity.periods as Record<string, unknown>[])
                      ?.slice(0, 2)
                      .map((period, pIdx) => (
                        <div
                          key={pIdx}
                          className="mb-2 rounded bg-muted/30 p-2 text-xs"
                        >
                          <div className="mb-1 text-[10px] text-muted-foreground">
                            {period.fye_date as string} (
                            {period.account_status as string})
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="text-muted-foreground">Revenue</div>
                            <div className="font-mono">
                              {formatCurrency(period.revenue_rm)}
                            </div>
                            <div className="text-muted-foreground">PBT</div>
                            <div className="font-mono">
                              {formatCurrency(period.pbt_rm)}
                            </div>
                            <div className="text-muted-foreground">PAT</div>
                            <div className="font-mono">
                              {formatCurrency(period.pat_rm)}
                            </div>
                            <div className="text-muted-foreground">EBITDA</div>
                            <div className="font-mono">
                              {formatCurrency(period.ebitda_rm)}
                            </div>
                            <div className="text-muted-foreground">TNW</div>
                            <div className="font-mono">
                              {formatCurrency(period.tangible_net_worth_rm)}
                            </div>
                            <div className="text-muted-foreground">
                              Total Debt
                            </div>
                            <div className="font-mono">
                              {formatCurrency(period.total_debt_rm)}
                            </div>
                            <div className="text-muted-foreground">Gearing</div>
                            <div className="font-mono">
                              {formatMultiple(period.gearing_times)}
                            </div>
                            <div className="text-muted-foreground">DSCR</div>
                            <div className="font-mono">
                              {formatMultiple(period.dscr_times)}
                            </div>
                            <div className="text-muted-foreground">
                              Interest Cover
                            </div>
                            <div className="font-mono">
                              {formatMultiple(period.interest_cover_times)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </CaSection>

              <CaSection title="Key Credit Issues">
                {keyCreditIssues?.map((issue, idx) => (
                  <div
                    key={idx}
                    className="mb-3 rounded bg-muted/30 p-2 last:mb-0"
                  >
                    <div className="text-xs font-medium">
                      {String(issue.issue_number ?? "")}.{" "}
                      {issue.issue_title as string}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {issue.description as string}
                    </p>
                    <div className="mt-1">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        {issue.risk_area as string}
                      </span>
                    </div>
                    {typeof issue.mitigant === "string" && issue.mitigant && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        Mitigant: {issue.mitigant}
                      </p>
                    )}
                  </div>
                ))}
              </CaSection>

              <CaSection title="Terms & Conditions">
                <div className="space-y-4">
                  {[
                    "existing_pre_drawdown",
                    "existing_post_drawdown",
                    "internal_conditions",
                  ].map((category) => {
                    const items = termsAndConditions[category] as
                      | Record<string, unknown>[]
                      | null
                    if (!items?.length) return null
                    return (
                      <div key={category}>
                        <div className="mb-1.5 text-xs font-medium capitalize">
                          {category.replace(/_/g, " ")}
                        </div>
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="mb-1 rounded bg-muted/30 p-2 text-xs last:mb-0"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="flex-1">
                                {item.condition as string}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                                  item.status === "Complied"
                                    ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                                    : item.status === "Breached"
                                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                )}
                              >
                                {item.status as string}
                              </span>
                            </div>
                            {typeof item.applicable_facility === "string" &&
                              item.applicable_facility && (
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  Facility: {item.applicable_facility}
                                </p>
                              )}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </CaSection>

              <CaSection title="MCC Decision">
                <div className="py-2 text-center">
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                      mccDecision.decision === "Approved"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    )}
                  >
                    {mccDecision.decision as string}
                  </div>
                  {typeof mccDecision.decision_remarks === "string" &&
                    mccDecision.decision_remarks && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {mccDecision.decision_remarks}
                      </p>
                    )}
                </div>
              </CaSection>
            </div>
          )}

          {/* Risks tab */}
          {activeTab === "risks" && (
            <div role="tabpanel" className="flex-1 overflow-y-auto">
              <CaSection title="Management Risk">
                <p className="text-xs text-muted-foreground">
                  Placeholder for management risk assessment. Will include
                  analysis of key personnel, board composition, management
                  succession planning, and governance structure.
                </p>
              </CaSection>

              <CaSection title="Collateral Risk / Asset Quality">
                <p className="text-xs text-muted-foreground">
                  Placeholder for collateral risk and asset quality review. Will
                  cover valuation adequacy, collateral coverage ratio, asset
                  depreciation, and enforceability of security interests.
                </p>
              </CaSection>

              <CaSection title="Market / Industry News / Bursa Announcements">
                <p className="text-xs text-muted-foreground">
                  Placeholder for market and industry analysis. Will include
                  sector outlook, competitive landscape, regulatory changes, and
                  material Bursa announcements affecting the borrower.
                </p>
              </CaSection>

              <CaSection title="Cashflow / Capacity Risk / Cash Conversion Cycle">
                <p className="text-xs text-muted-foreground">
                  Placeholder for cashflow and capacity risk assessment. Will
                  cover operating cashflow trends, debt service coverage, cash
                  conversion cycle efficiency, and liquidity position.
                </p>
              </CaSection>

              <CaSection title="Operational / Project Risk">
                <p className="text-xs text-muted-foreground">
                  Placeholder for operational and project risk analysis. Will
                  include project milestone tracking, operational efficiency
                  metrics, supply chain risks, and business continuity planning.
                </p>
              </CaSection>

              <CaSection title="Fraud Risk">
                <p className="text-xs text-muted-foreground">
                  Placeholder for fraud risk indicators. Will cover red flags in
                  financial statements, related-party anomalies, audit concerns,
                  and AML/CFT compliance status.
                </p>
              </CaSection>

              <CaSection title="Related Party Transaction / Fund Leakage / Dividend Paid">
                <p className="text-xs text-muted-foreground">
                  Placeholder for related-party transaction analysis. Will
                  include material RPTs, fund flow analysis, dividend payout
                  patterns, and potential fund leakage indicators.
                </p>
              </CaSection>

              <CaSection title="Financial Analysis">
                <p className="text-xs text-muted-foreground">
                  Placeholder for detailed financial analysis. Will cover
                  profitability trends, leverage ratios, efficiency metrics,
                  working capital analysis, and peer benchmarking.
                </p>
              </CaSection>

              <CaSection title="Areas for Probe (Others)">
                <p className="text-xs text-muted-foreground">
                  Placeholder for additional areas requiring further
                  investigation. Will include miscellaneous risk flags, pending
                  litigations, contingent liabilities, and other credit
                  concerns.
                </p>
              </CaSection>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
