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

export interface Job {
  status: "processing" | "complete" | "error"
  startedAt: number
  result?: unknown
  error?: string
}
