import type { ReviewResult } from "@/types/review"

export function parseResponse(_raw: unknown): ReviewResult {
  // TODO: Replace with actual parsing when API contract is known
  return {
    summary:
      "This loan application has been flagged for further review due to inconsistencies in income verification and credit history.",
    riskScore: 72,
    status: "flagged",
    findings: [
      {
        category: "Income Verification",
        severity: "critical",
        title: "Declared income significantly exceeds industry average",
        description:
          "The applicant declared a monthly income of RM 45,000, which is substantially higher than the average for their stated occupation and experience level. Supporting documents show inconsistent figures.",
      },
      {
        category: "Credit History",
        severity: "warning",
        title: "Multiple recent credit inquiries",
        description:
          "Three credit inquiries were made within the last 90 days, suggesting the applicant may be seeking credit from multiple sources simultaneously.",
      },
      {
        category: "Employment",
        severity: "info",
        title: "Employment duration below recommended threshold",
        description:
          "The applicant has been with their current employer for 8 months. The recommended minimum is 12 months for conventional loan approval.",
      },
    ],
    recommendations: [
      "Request additional income verification documents (e.g., EPF statement, tax returns)",
      "Obtain a full credit report from CCRIS/CTOS",
      "Consider requiring a guarantor given the employment duration",
    ],
  }
}
