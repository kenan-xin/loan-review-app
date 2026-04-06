"use client"

import type { ReviewResult } from "@/types/review"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react"

interface ResultsStepProps {
  readonly result: ReviewResult
  readonly onStartNew: () => void
}

const severityOrder: { critical: 0; warning: 1; info: 2 } = {
  critical: 0,
  warning: 1,
  info: 2,
}

const severityConfig = {
  critical: {
    icon: XCircle,
    label: "Critical",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    badgeClassName:
      "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    badgeClassName:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
  },
  info: {
    icon: Info,
    label: "Info",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
    badgeClassName:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  },
}

const statusConfig = {
  approved: {
    icon: CheckCircle,
    label: "Approved",
    className:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
    scoreColor: "text-green-600 dark:text-green-400",
    barColor: "bg-green-500",
  },
  flagged: {
    icon: AlertTriangle,
    label: "Flagged",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    scoreColor: "text-amber-600 dark:text-amber-400",
    barColor: "bg-amber-500",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    scoreColor: "text-red-600 dark:text-red-400",
    barColor: "bg-red-500",
  },
}

export function ResultsStep({ result, onStartNew }: ResultsStepProps) {
  const sortedFindings = [...result.findings].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )

  const status = statusConfig[result.status]
  const StatusIcon = status.icon

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-4 py-3",
          status.className
        )}
      >
        <StatusIcon className="size-5" />
        <span className="text-sm font-semibold">{status.label}</span>
      </div>

      {/* Risk Score + Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="shrink-0">
          <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Risk Score
          </p>
          <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-4">
            <span className={cn("text-3xl font-bold", status.scoreColor)}>
              {result.riskScore}
            </span>
            <span className="text-xs text-muted-foreground">out of 100</span>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status.barColor
                )}
                style={{ width: `${result.riskScore}%` }}
              />
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Summary
          </p>
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </div>
      </div>

      {/* Findings */}
      {sortedFindings.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Findings
          </p>
          <ul className="space-y-3">
            {sortedFindings.map((finding) => {
              const config = severityConfig[finding.severity]
              const Icon = config.icon
              return (
                <li
                  key={`${finding.severity}-${finding.category}-${finding.title}`}
                  className={cn("rounded-lg border p-4", config.className)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {finding.category}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            config.badgeClassName
                          )}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        {finding.title}
                      </p>
                      <p className="mt-1 text-sm opacity-80">
                        {finding.description}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Recommendations
          </p>
          <ol className="list-inside list-decimal space-y-2">
            {result.recommendations.map((rec) => (
              <li key={rec} className="text-sm leading-relaxed">
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Start New */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={onStartNew}>
          Start New Review
        </Button>
      </div>
    </div>
  )
}
