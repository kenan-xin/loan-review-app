"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SimulationResult } from "@/types/review"
import { useLoanReviewStore } from "@/store/loan-review"
import { LayoutBriefing } from "./results/layout-briefing"
import { LayoutLedger } from "./results/layout-ledger"
import { ResultHeader } from "./results/result-header"
import { ResultSidebar } from "./results/result-sidebar"
import { RiskPanel } from "./results/risk-panel"
import { CaDataPanel } from "./results/ca-data-panel"
import { RISK_CATEGORIES } from "@/lib/risk-framework"

interface ResultsStepProps {
  readonly result: SimulationResult
  readonly onStartNew?: () => void
}

export function ResultsStep({ result }: ResultsStepProps) {
  const [activeTab, setActiveTab] = useState<"ca-data" | "risks">("risks")
  const { resultLayout } = useLoanReviewStore()

  const { caData, evaluationResults, evaluationSummary, evaluationDecision } =
    result

  const basicInfo = caData.A_basic_information as Record<string, unknown>
  const riskSummaries = Object.fromEntries(
    RISK_CATEGORIES.map((c) => [c.id, "No AI summary available yet."])
  )

  const layoutProps = { result, activeTab, onTabChange: setActiveTab }

  return (
    <div className="flex h-full flex-col">
      <ResultHeader />

      {resultLayout === "sidebar" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[380px_1fr]">
          <ResultSidebar
            basicInfo={basicInfo}
            evaluationSummary={evaluationSummary}
            evaluationDecision={evaluationDecision}
            riskScore={result.riskScore}
            riskBand={result.riskBand}
          />

          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border">
            {/* Tab bar */}
            <div role="tablist" className="flex shrink-0 border-b">
              {(["ca-data", "risks"] as const).map((tab) => (
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
                  {tab === "risks" ? "Risks" : "CA Data"}
                </button>
              ))}
            </div>

            {activeTab === "risks" && (
              <RiskPanel
                rules={evaluationResults}
                riskSummaries={riskSummaries}
              />
            )}

            {activeTab === "ca-data" && <CaDataPanel caData={caData} />}
          </div>
        </div>
      )}

      {resultLayout === "briefing" && <LayoutBriefing {...layoutProps} />}

      {resultLayout === "ledger" && <LayoutLedger {...layoutProps} />}
    </div>
  )
}
