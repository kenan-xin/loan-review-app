export interface Finding {
  category: string
  severity: "info" | "warning" | "critical"
  title: string
  description: string
}

export interface ReviewResult {
  summary: string
  riskScore: number
  status: "approved" | "flagged" | "rejected"
  findings: Finding[]
  recommendations: string[]
}

export type RiskCategoryId =
  | "management"
  | "collateral"
  | "market"
  | "cashflow"
  | "operational"
  | "fraud"
  | "related_party"
  | "financial"
  | "probe"

export interface EvaluationRuleResult {
  rule_title: string
  risk_category: string
  result: "PASS" | "FAIL" | "WARNING" | "MISSING" | "N/A"
  extracted_values: Record<string, unknown>
  explanation: string
  action: string | null
  risk_level: "High" | "Medium" | "Low"
  required_fields: string[]
  source_evidence: string[]
  source_file: string | null
  validation_logic: string
}

export interface EvaluationSummary {
  total_rules_evaluated: number
  total_pass: number
  total_warning: number
  total_fail: number
  total_missing: number
  total_na: number
  by_category: Record<
    string,
    { pass: number; warning: number; fail: number; missing: number }
  >
  by_risk_level: {
    high_fail_count: number
    medium_fail_count: number
    low_fail_count: number
  }
}

export interface EvaluationDecision {
  recommendation: string
  key_strengths: string[]
  key_concerns: string[]
  required_conditions: string[] | null
  missing_information: string[]
  reasoning: string
}

export interface CaData {
  A_basic_information?: Record<string, unknown>
  B_borrower_profile?: Record<string, unknown>
  C_key_persons?: Record<string, unknown>[]
  D_shareholding_changes?: unknown
  E_facilities?: Record<string, unknown>
  F_securities?: Record<string, unknown>
  G_group_exposure?: Record<string, unknown>
  H_profitability_profile?: Record<string, unknown>
  I_financial_summaries?: Record<string, unknown>[]
  J_business_background?: Record<string, unknown>
  K_key_credit_issues?: Record<string, unknown>[]
  L_recommendations?: Record<string, unknown>
  M_terms_and_conditions?: Record<string, unknown>
  N_mcc_decision?: Record<string, unknown>
  O_application_requests?: Record<string, unknown>[]
}

export type SimulationResult = ReviewResult & {
  riskBand: "low" | "medium" | "high"
  caData: CaData
  evaluationResults: EvaluationRuleResult[]
  evaluationSummary: EvaluationSummary
  evaluationDecision: EvaluationDecision
}
