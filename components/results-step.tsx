"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SimulationResult } from "@/types/review"
import { useLoanReviewStore } from "@/store/loan-review"
import type { ResultLayout } from "./results/types"
import { LayoutBriefing } from "./results/layout-briefing"
import { LayoutLedger } from "./results/layout-ledger"
import { ResultHeader } from "./results/result-header"
import { ResultSidebar } from "./results/result-sidebar"
import { RiskPanel } from "./results/risk-panel"
import { CaDataPanel } from "./results/ca-data-panel"

interface ResultsStepProps {
  readonly result: SimulationResult
  readonly onStartNew?: () => void
}

export function ResultsStep({ result }: ResultsStepProps) {
  const [activeTab, setActiveTab] = useState<"ca-data" | "risks">("risks")
  const { resultLayout, setResultLayout } = useLoanReviewStore()

  const { caData, evaluationResults, evaluationSummary, evaluationDecision } =
    result

  const basicInfo = caData.A_basic_information as Record<string, unknown>
  const riskSummaries = evaluationSummary.risk_summaries ?? {}

  const layoutProps = { result, activeTab, onTabChange: setActiveTab }

  return (
    <div className="flex h-full flex-col">
      <ResultHeader layout={resultLayout} onLayoutChange={setResultLayout} />

      {resultLayout === "sidebar" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[360px_1fr]">
          <ResultSidebar
            basicInfo={basicInfo}
            evaluationSummary={evaluationSummary}
            evaluationDecision={evaluationDecision}
          />

          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
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
