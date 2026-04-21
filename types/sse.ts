export interface SseEnvelope {
  codeStatus: number
  completionTokens: number
  eventType: string
  nodeID: string
  output: SseOutput
  promptTokens: number
  requestMessageID: string
  startTime: string
  status: string
  userTokens: number
  uuid: string
}

export type SseOutput =
  | { status: "processing the document" }
  | { index: number; status: "extracting" }
  | { index: number; status: "checking" }
  | SseFinalOutput

export interface SseFinalOutput {
  ca: Record<string, unknown>
  result: Array<{
    rule_title: string
    risk_category: string
    result: string
    extracted_values: Record<string, unknown>
    explanation: string
    action: string | null
    risk_level: string
    required_fields: string[]
    source_evidence: string[]
    source_file: string | null
    validation_logic: string
  }>
  summary: {
    total_rules_evaluated: number
    total_pass: number
    total_warning: number
    total_fail: number
    total_missing: number
    total_na: number
    by_category: Record<string, { pass: number; warning: number; fail: number; missing: number }>
    by_risk_level: { high_fail_count: number; medium_fail_count: number; low_fail_count: number }
  }
  decision: {
    recommendation: string
    key_strengths: string[]
    key_concerns: string[]
    required_conditions: string[] | null
    missing_information: string[]
    reasoning: string
  }
}
