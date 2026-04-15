import type { SimulationResult } from "@/types/review"

export type ResultLayout = "sidebar" | "briefing" | "ledger"

export interface ResultLayoutProps {
  readonly result: SimulationResult
  readonly activeTab: "ca-data" | "risks"
  readonly onTabChange: (tab: "ca-data" | "risks") => void
}
