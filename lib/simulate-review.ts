import type {
  SimulationResult,
  CaData,
  EvaluationRuleResult,
  EvaluationSummary,
  EvaluationDecision,
} from "@/types/review"
import caExtractedData from "@/app/data/ca_extracted_rh_group.json"
import evaluationData from "@/app/data/evaluation_report_rh_group.json"

export function loadSimulationData(): {
  caData: CaData
  evaluationResults: EvaluationRuleResult[]
  evaluationSummary: EvaluationSummary
  evaluationDecision: EvaluationDecision
} {
  const typed = evaluationData as {
    evaluation_results: EvaluationRuleResult[]
    summary: EvaluationSummary
    decision: EvaluationDecision
  }
  return {
    caData: caExtractedData as CaData,
    evaluationResults: typed.evaluation_results,
    evaluationSummary: typed.summary,
    evaluationDecision: typed.decision,
  }
}

export function transformToReviewResult(
  caData: CaData,
  evaluationResults: EvaluationRuleResult[],
  evaluationSummary: EvaluationSummary,
  evaluationDecision: EvaluationDecision
): SimulationResult {
  const { findings, recommendations } =
    transformFindingsAndRecommendations(evaluationResults)
  const riskScore = calculateRiskScore(findings)
  const status = determineStatus(findings)
  const summary = generateSummary(caData, findings)

  return {
    summary,
    riskScore,
    status,
    findings,
    recommendations,
    caData,
    evaluationResults,
    evaluationSummary,
    evaluationDecision,
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
      category: rule.category_5c,
      severity,
      title: rule.rule_title,
      description:
        rule.explanation + (rule.action ? `\n\nAction: ${rule.action}` : ""),
    })

    if (rule.action && rule.result !== "PASS") {
      recommendations.push(
        `[${rule.category_5c}] ${rule.rule_title}: ${rule.action}`
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

function calculateRiskScore(findings: SimulationResult["findings"]): number {
  const criticalCount = findings.filter((f) => f.severity === "critical").length
  const warningCount = findings.filter((f) => f.severity === "warning").length
  const infoCount = findings.filter((f) => f.severity === "info").length

  const score = 100 - criticalCount * 15 - warningCount * 5 - infoCount * 1
  return Math.max(0, Math.min(100, score))
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

  const basicInfo = caData.A_basic_information as {
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
