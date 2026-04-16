"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { RESULT_CONFIG, RISK_CATEGORIES } from "@/lib/risk-framework"
import type { EvaluationSummary, EvaluationDecision } from "@/types/review"
import { RiskMeter } from "./risk-meter"

interface ResultSidebarProps {
  readonly basicInfo: Record<string, unknown>
  readonly evaluationSummary: EvaluationSummary
  readonly evaluationDecision: EvaluationDecision
}

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
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/30"
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
          <div className="px-5 pb-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ResultSidebar({
  basicInfo,
  evaluationSummary,
  evaluationDecision,
}: ResultSidebarProps) {
  const uniqueConcerns = [...new Set(evaluationDecision.key_concerns)]
  const uniqueStrengths = [...new Set(evaluationDecision.key_strengths)]
  const byRiskCategory = evaluationSummary.by_risk_category
  const riskScore = evaluationSummary.risk_score ?? 0
  const riskBand = evaluationSummary.risk_band ?? "medium"

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border lg:max-h-full">
      {/* Group info banner */}
      <div className="shrink-0 bg-primary px-5 py-4 text-primary-foreground">
        <div className="text-lg font-bold tracking-tight">
          {basicInfo.group_name as string}
        </div>
        <div className="mt-0.5 text-xs opacity-75">
          <span>{basicInfo.ca_reference_no as string}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="tracking-wide uppercase opacity-60">App Type</span>
            <span className="font-semibold">
              {basicInfo.application_type as string}
            </span>
          </div>
          <span className="opacity-40">·</span>
          <div className="flex items-center gap-1">
            <span className="tracking-wide uppercase opacity-60">
              Relationship
            </span>
            <span className="font-semibold">
              {(basicInfo.relationship_strategy as string) ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Risk gauge */}
      <div className="shrink-0 border-b px-5 pt-5 pb-4">
        <RiskMeter value={riskScore} band={riskBand} size="md" />
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
              className="flex flex-col items-center border-r py-3.5 last:border-r-0"
            >
              <span
                className={cn("font-mono text-xl font-semibold", cfg.statColor)}
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

      {/* Executive AI Summary */}
      {evaluationDecision.reasoning && (
        <div className="border-b px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-3 text-muted-foreground" />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              AI Summary
            </span>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/80">
            {evaluationDecision.reasoning}
          </p>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Risk Categories */}
        <div className="border-b px-5 py-4">
          <div className="mb-3 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Risk Categories
          </div>
          <div className="space-y-2.5">
            {RISK_CATEGORIES.map((cat) => {
              const stats = byRiskCategory[cat.id]
              if (!stats || stats.total === 0) return null
              const total = stats.total
              return (
                <div key={cat.id}>
                  <div className="mb-1">
                    <span className="text-xs text-foreground">{cat.label}</span>
                    <div className="font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                      {stats.fail}F ({Math.round((stats.fail / total) * 100)}%)
                      · {stats.warning}W (
                      {Math.round((stats.warning / total) * 100)}%) ·{" "}
                      {stats.pass}P ({Math.round((stats.pass / total) * 100)}%)
                      · {stats.missing}UV (
                      {Math.round((stats.missing / total) * 100)}%)
                    </div>
                  </div>
                  <div className="flex h-1.5 gap-px overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    {stats.fail > 0 && (
                      <div
                        className="bg-red-400"
                        style={{ width: `${(stats.fail / total) * 100}%` }}
                      />
                    )}
                    {stats.warning > 0 && (
                      <div
                        className="bg-amber-300"
                        style={{
                          width: `${(stats.warning / total) * 100}%`,
                        }}
                      />
                    )}
                    {stats.pass > 0 && (
                      <div
                        className="bg-emerald-400"
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
                <span className="mt-0.5 shrink-0 text-red-400">•</span>
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
                <span className="mt-0.5 shrink-0 text-emerald-400">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </LeftSection>

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
                  className="pl-2.5 text-xs leading-relaxed text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </LeftSection>
        )}
      </div>
    </div>
  )
}
