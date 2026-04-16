import type { RiskCategoryId } from "./risk-framework"
import { RISK_CATEGORIES, RISK_CATEGORY_MAP } from "./risk-framework"
import type { EvaluationRuleResult } from "@/types/review"

export interface CategoryScore {
  raw: number
  pct: number
  counts: {
    pass: number
    warning: number
    fail: number
    missing: number
    total: number
  }
}

export interface RiskScoreResult {
  overall_pct: number
  band: "low" | "medium" | "high"
  per_category: Record<RiskCategoryId, CategoryScore>
}

function countByStatus(
  rules: EvaluationRuleResult[],
  categoryId: RiskCategoryId
) {
  const filtered = rules.filter((r) => r.risk_category === categoryId)
  return {
    pass: filtered.filter((r) => r.result === "PASS").length,
    warning: filtered.filter((r) => r.result === "WARNING").length,
    fail: filtered.filter((r) => r.result === "FAIL").length,
    missing: filtered.filter((r) => r.result === "MISSING").length,
    total: filtered.length,
  }
}

export function computeRiskScore(
  rules: EvaluationRuleResult[]
): RiskScoreResult {
  const perCategory = {} as Record<RiskCategoryId, CategoryScore>

  let weightedSum = 0
  let totalWeightedItems = 0

  for (const cat of RISK_CATEGORIES) {
    const counts = countByStatus(rules, cat.id)
    const raw = counts.fail * 3 + counts.missing * 2 + counts.warning * 1
    const pct = counts.total > 0 ? (raw / (counts.total * 3)) * 100 : 0

    perCategory[cat.id] = { raw, pct: Math.round(pct * 10) / 10, counts }

    const weight = RISK_CATEGORY_MAP[cat.id].weight
    weightedSum += pct * weight * counts.total
    totalWeightedItems += weight * counts.total
  }

  const overall_pct =
    totalWeightedItems > 0
      ? Math.round((weightedSum / totalWeightedItems) * 10) / 10
      : 0

  let band: "low" | "medium" | "high"
  if (overall_pct <= 30) band = "low"
  else if (overall_pct <= 60) band = "medium"
  else band = "high"

  return { overall_pct, band, per_category: perCategory }
}
