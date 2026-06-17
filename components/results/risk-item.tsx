"use client"

import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { RESULT_CONFIG } from "@/lib/risk-framework"
import type { EvaluationRuleResult } from "@/types/review"

interface RiskItemProps {
  readonly rule: EvaluationRuleResult
  readonly isExpanded: boolean
  readonly onToggle: () => void
}

export function RiskItem({ rule, isExpanded, onToggle }: RiskItemProps) {
  const cfg = RESULT_CONFIG[rule.result as keyof typeof RESULT_CONFIG] ?? RESULT_CONFIG["PASS"]
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30"
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
          isExpanded ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pt-0 pb-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {rule.explanation}
            </p>
            {rule.action && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Action
                </span>
                <p className="mt-0.5 text-xs text-foreground">{rule.action}</p>
              </div>
            )}
            {rule.required_fields.length > 0 && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required Fields
                </span>
                <ul className="mt-1 space-y-0.5">
                  {rule.required_fields.map((field, i) => (
                    <li key={i} className="font-mono text-[10px] text-muted-foreground">
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rule.source_evidence.length > 0 && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Source Evidence
                </span>
                <ul className="mt-1 space-y-0.5">
                  {rule.source_evidence.map((evidence, i) => (
                    <li key={i} className="text-[10px] leading-relaxed text-muted-foreground">
                      {evidence}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rule.source_file && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Source File
                </span>
                <p className="mt-0.5 text-xs text-foreground">{rule.source_file}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
