import type {
  SimulationResult,
  CaData,
  EvaluationRuleResult,
  EvaluationSummary,
  EvaluationDecision,
} from "@/types/review"
import { deriveRiskBand } from "@/lib/risk-band"

export function transformToReviewResult(
  caData: CaData,
  evaluationResults: EvaluationRuleResult[],
  evaluationSummary: EvaluationSummary,
  evaluationDecision: EvaluationDecision
): SimulationResult {
  const filteredResults = evaluationResults.filter(
    (r) => r.result !== "N/A"
  )

  const { findings, recommendations } =
    transformFindingsAndRecommendations(filteredResults)

  const riskScore =
    evaluationSummary.total_rules_evaluated > 0
      ? Math.round(
          (evaluationSummary.total_pass /
            evaluationSummary.total_rules_evaluated) *
            100
        )
      : 0

  const riskBand = deriveRiskBand(riskScore)
  const status = determineStatus(findings)
  const summary = generateSummary(caData, findings)

  const safeDecision: EvaluationDecision = {
    ...evaluationDecision,
    required_conditions: evaluationDecision.required_conditions ?? [],
  }

  return {
    summary,
    riskScore,
    riskBand,
    status,
    findings,
    recommendations,
    caData,
    evaluationResults: filteredResults,
    evaluationSummary,
    evaluationDecision: safeDecision,
  }
}

function transformFindingsAndRecommendations(
  evaluationResults: EvaluationRuleResult[]
) {
  const findings: SimulationResult["findings"] = []
  const recommendations: string[] = []

  for (const rule of evaluationResults) {
    const severity = mapResultToSeverity(rule.result)

    findings.push({
      category: rule.risk_category,
      severity,
      title: rule.rule_title,
      description:
        rule.explanation + (rule.action ? `\n\nAction: ${rule.action}` : ""),
    })

    if (rule.action && rule.result !== "PASS") {
      recommendations.push(
        `[${rule.risk_category}] ${rule.rule_title}: ${rule.action}`
      )
    }
  }

  return { findings, recommendations }
}

function mapResultToSeverity(
  result: EvaluationRuleResult["result"]
): "info" | "warning" | "critical" {
  switch (result) {
    case "FAIL":
      return "critical"
    case "WARNING":
      return "warning"
    case "MISSING":
      return "warning"
    case "PASS":
    default:
      return "info"
  }
}

function determineStatus(
  findings: SimulationResult["findings"]
): "approved" | "flagged" | "rejected" {
  const criticalCount = findings.filter((f) => f.severity === "critical").length
  const warningCount = findings.filter((f) => f.severity === "warning").length

  if (criticalCount >= 3) return "rejected"
  if (criticalCount >= 1 || warningCount >= 5) return "flagged"
  return "approved"
}

function generateSummary(
  caData: CaData,
  findings: SimulationResult["findings"]
): string {
  const criticalIssues = findings.filter((f) => f.severity === "critical")
  const warningIssues = findings.filter((f) => f.severity === "warning")

  const basicInfo = (caData.A_basic_information ?? {}) as {
    group_name?: string
    borrower_names?: string[]
  }
  const groupName = basicInfo.group_name || "Unknown Group"
  const borrowers = basicInfo.borrower_names?.join(", ") || "Unknown"

  let summary = `${groupName} (${borrowers}) - Review processed. `

  if (criticalIssues.length > 0) {
    summary += `${criticalIssues.length} critical issue(s) identified requiring immediate attention. `
  }
  if (warningIssues.length > 0) {
    summary += `${warningIssues.length} warning(s) noted that should be reviewed. `
  }
  if (criticalIssues.length === 0 && warningIssues.length === 0) {
    summary += "All evaluation checks passed."
  }

  return summary
}
