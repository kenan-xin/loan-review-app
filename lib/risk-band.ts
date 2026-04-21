export type RiskBand = "low" | "medium" | "high"

export function deriveRiskBand(score: number): RiskBand {
  if (score >= 70) return "low"
  if (score >= 40) return "medium"
  return "high"
}
