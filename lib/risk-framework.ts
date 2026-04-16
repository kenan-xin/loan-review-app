import {
  AlertTriangle,
  BarChart3,
  Building2,
  DollarSign,
  FileSearch,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

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

export interface RiskCategory {
  id: RiskCategoryId
  label: string
  weight: number
  icon: React.ComponentType<{ className?: string }>
}

export const RISK_CATEGORIES: RiskCategory[] = [
  {
    id: "management",
    label: "Management Risk",
    weight: 1.5,
    icon: Users,
  },
  {
    id: "collateral",
    label: "Collateral Risk / Asset Quality",
    weight: 1.3,
    icon: ShieldCheck,
  },
  {
    id: "market",
    label: "Market / Industry News / Bursa",
    weight: 0.9,
    icon: TrendingUp,
  },
  {
    id: "cashflow",
    label: "Cashflow / Capacity / CCC",
    weight: 1.5,
    icon: DollarSign,
  },
  {
    id: "operational",
    label: "Operational / Project Risk",
    weight: 1.1,
    icon: Building2,
  },
  {
    id: "fraud",
    label: "Fraud Risk",
    weight: 1.5,
    icon: AlertTriangle,
  },
  {
    id: "related_party",
    label: "Related Party / Fund Leakage / Dividend",
    weight: 1.2,
    icon: Zap,
  },
  {
    id: "financial",
    label: "Financial Analysis",
    weight: 1.3,
    icon: BarChart3,
  },
  {
    id: "probe",
    label: "Areas for Probe (Others)",
    weight: 0.5,
    icon: FileSearch,
  },
]

export const RISK_CATEGORY_MAP = Object.fromEntries(
  RISK_CATEGORIES.map((c) => [c.id, c])
) as Record<RiskCategoryId, RiskCategory>

export type RuleStatus = "PASS" | "FAIL" | "WARNING" | "MISSING" | "N/A"

export const RESULT_CONFIG = {
  FAIL: {
    label: "FAIL",
    badge: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    barColor: "bg-red-400",
    statColor: "text-red-500 dark:text-red-400",
  },
  WARNING: {
    label: "WARN",
    badge:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    barColor: "bg-amber-300",
    statColor: "text-amber-500 dark:text-amber-400",
  },
  PASS: {
    label: "PASS",
    badge:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    barColor: "bg-emerald-400",
    statColor: "text-emerald-500 dark:text-emerald-400",
  },
  MISSING: {
    label: "MISS",
    badge: "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    barColor: "bg-slate-200 dark:bg-slate-600",
    statColor: "text-slate-500 dark:text-slate-400",
  },
  "N/A": {
    label: "N/A",
    badge:
      "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500",
    barColor: "bg-slate-200 dark:bg-slate-700",
    statColor: "text-slate-500 dark:text-slate-500",
  },
} as const

// Keyword-based mapper from 5C category + rule title to new risk category.
// Returns null if no match (falls back to "probe").
const KEYWORD_RULES: Array<{
  keywords: string[]
  category_5c?: string[]
  target: RiskCategoryId
}> = [
  // Management
  {
    keywords: [
      "management",
      "key person",
      "key personnel",
      "keyman",
      "director",
      "board",
      "governance",
      "succession",
      "shareholder",
      "shareholding",
      "ownership",
      "guarantor",
      "corporate guarantee",
      "unresolved concern",
      "obligor",
      "pnw",
      "private equity",
      "divestment",
      "divest",
      "roc report",
      "sole proprietor",
      "partnership",
    ],
    target: "management",
  },
  // Collateral
  {
    keywords: [
      "collateral",
      "security",
      "valuation",
      "coverage ratio",
      "unsecured",
      "secured",
      "bridging loan",
      "land financing",
      "charge",
      "mortgage",
      "enforceability",
      "asset quality",
      "moa",
      "jsg",
      "waiver",
      "pari-passu",
      "cross-charge",
      "negative pledge",
      "spa price",
      "cancellation",
      "property security",
      "leasehold",
      "cer reduction",
      "discharge",
      "cg release",
      "stamping",
    ],
    target: "collateral",
  },
  // Market / Industry
  {
    keywords: [
      "market",
      "industry",
      "sector",
      "commodity price",
      "bursa",
      "regulatory",
      "competition",
      "outlook",
      "news",
      "announcement",
    ],
    target: "market",
  },
  // Cashflow / Capacity
  {
    keywords: [
      "cashflow",
      "capacity",
      "cash conversion",
      "ccc",
      "debt service",
      "dscr",
      "interest cover",
      "liquidity",
      "working capital",
      "revenue",
      "ebitda",
      "pbt",
      "pat",
      "profit",
      "loss",
      "earnings",
      "contract financing",
      "new venture",
      "alternative cashflow",
      "debtor",
      "creditor",
      "aging",
      "trade debtor",
      "trade creditor",
      "receivable",
      "payable",
      "cash flow",
      "rora",
      "spread",
      "rate shaving",
      "financial spread",
      "bullet repayment",
      "repayment",
      "step-up",
      "capex",
      "capital expenditure",
      "non-core business",
      "account plan",
      "financial data recency",
      "financial summary",
      "staleness",
      "outdated financial",
      "latest financial",
      "latest management account",
      "re-availment",
      "group financial",
      "facility limits",
      "machinery",
      "property financing",
      "pricing differentiation",
      "svca",
    ],
    target: "cashflow",
  },
  // Operational / Project
  {
    keywords: [
      "operational",
      "project",
      "milestone",
      "supply chain",
      "business continuity",
      "construction",
      "plant",
      "equipment",
      "infrastructure",
      "drawdown",
      "disbursement",
      "progress",
      "facility purpose",
      "review expiry",
      "interim extension",
      "rollover",
      "facility structure",
      "stage 2",
      "loan modification",
      "watchlist",
      "high-risk",
      "restructuring",
      "pdc",
      "pre-drawdown",
      "post-drawdown",
      "approval",
      "approving authority",
      "ecof",
      "icof",
      "cgc",
      "sjpp",
      "ramci",
      "non-submission",
      "short interim",
      "facility table",
      "reconciliation",
      "next review date",
      "overdue account",
      "undrawn",
    ],
    target: "operational",
  },
  // Fraud
  {
    keywords: [
      "fraud",
      "red flag",
      "suspicious",
      "aml",
      "cft",
      "audit",
      "audit qualification",
      "money laundering",
      "ccris",
      "ctos",
      "credit bureau",
      "litigation",
      "legal",
      "court case",
      "bankruptcy",
      "default history",
      "pn17",
      "pn1",
      "gn3",
      "impaired",
      "special attention",
      "disclaimer",
      "adverse opinion",
      "classification",
      "obligatory trigger",
      "watchlist indicator",
    ],
    target: "fraud",
  },
  // Related Party
  {
    keywords: [
      "related party",
      "rpt",
      "fund leakage",
      "dividend",
      "inter-company",
      "intercompany",
      "transfer pricing",
      "connected party",
      "fund flow",
      "advances from related",
    ],
    target: "related_party",
  },
  // Financial Analysis
  {
    keywords: [
      "gearing",
      "leverage",
      "tangible net worth",
      "tnw",
      "financial ratio",
      "roe",
      "roa",
      "sme status",
      "crr",
      "esg",
      "bnm classification",
      "peer benchmark",
      "financial statement",
      "balance sheet",
      "income statement",
      "cash flow statement",
      "sensitivity analysis",
      "financial strength",
      "stock holding",
      "debt level",
      "group exposure",
      "total customer exposure",
      "advances",
      "consolidated account",
      "financial matrix",
      "current assets",
      "current liabilities",
      "revaluation reserve",
      "goodwill",
      "intangible",
      "subordination",
      "pro-forma",
      "pro forma",
      "column placement",
      "financial spreading",
    ],
    target: "financial",
  },
  // Conditions → Operational (T&Cs, covenants, compliance)
  {
    keywords: [
      "covenant",
      "condition",
      "compliance",
      "complied",
      "breached",
      "pending",
      "internal condition",
      "pre-drawdown",
      "post-drawdown",
      "t&c",
      "terms and condition",
      "policy exception",
      "sel",
      "aggregation",
      "exposure",
      "group exposure",
      "re-drawing",
    ],
    category_5c: ["Conditions"],
    target: "operational",
  },
  // Character → Management or Fraud
  {
    keywords: [
      "credit card utilization",
      "credit behaviour",
      "repayment",
      "track record",
    ],
    category_5c: ["Character"],
    target: "fraud",
  },
  // Capital → Financial
  {
    keywords: [],
    category_5c: ["Capital"],
    target: "financial",
  },
]

// Manual overrides for specific rule titles that keyword mapper gets wrong.
const MANUAL_OVERRIDES: Array<{
  titleContains: string
  target: RiskCategoryId
}> = [
  {
    titleContains: "Revolving Facility Re-utilization Covenant",
    target: "operational",
  },
  {
    titleContains: "Blanket TL/IHP Minimum Drawdown Covenant",
    target: "operational",
  },
  { titleContains: "Bridging Loan Redemption Coverage", target: "collateral" },
  {
    titleContains: "Bridging Loan and Land Financing Package",
    target: "operational",
  },
  { titleContains: "Policy Exception Tagging", target: "operational" },
  { titleContains: "SCEL Aggregation", target: "operational" },
  { titleContains: "CCRIS High Credit Card", target: "fraud" },
  { titleContains: "Parental CRR Adoption", target: "management" },
  { titleContains: "SME Status Verification", target: "financial" },
  { titleContains: "Unsecured Exposure Within Group", target: "collateral" },
  {
    titleContains: "Related Company Financials as Additional Support",
    target: "financial",
  },
  { titleContains: "Quarterly Financials Validation", target: "cashflow" },
  { titleContains: "Facility Section E Data Accuracy", target: "operational" },
  // Redistribute to related_party
  {
    titleContains: "Advances from Related Companies Classification",
    target: "related_party",
  },
  {
    titleContains: "Related Company Financials as Additional Support",
    target: "related_party",
  },
  { titleContains: "Shareholding Divestment Impact", target: "related_party" },
  {
    titleContains: "Substantial Equity Stake Disposal",
    target: "related_party",
  },
  {
    titleContains: "Private Equity Entry - Keyman Shareholding",
    target: "related_party",
  },
  {
    titleContains: "Shareholding Change - Major Shareholding Breach",
    target: "related_party",
  },
  {
    titleContains: "Fragmented Shareholding Red Flag",
    target: "related_party",
  },
  {
    titleContains: "Fragmented Shareholders Risk Assessment",
    target: "related_party",
  },
  {
    titleContains: "Fragmented Shareholders - MOA Reasonableness",
    target: "related_party",
  },
  {
    titleContains: "Shareholding Changes - Pre and Post Org Chart",
    target: "related_party",
  },
  {
    titleContains: "Pro-Forma Financial Assessment for Material Divestments",
    target: "related_party",
  },
  // Redistribute some management to probe
  {
    titleContains: "SJPP/CGC Guaranteed Facility - Guarantor Information",
    target: "operational",
  },
  {
    titleContains: "CG Discharge - Outgoing and Incoming Guarantor",
    target: "collateral",
  },
  { titleContains: "JSG Guarantor PNW Must Be Provided", target: "collateral" },
  {
    titleContains: "Total Customer Exposure Must Include All Obligors",
    target: "financial",
  },
]

export function mapRuleToRiskCategory(
  ruleTitle: string,
  category5c: string
): RiskCategoryId {
  // Check manual overrides first
  for (const override of MANUAL_OVERRIDES) {
    if (ruleTitle.includes(override.titleContains)) {
      return override.target
    }
  }

  // Keyword matching
  const titleLower = ruleTitle.toLowerCase()
  const cat5c = category5c

  for (const rule of KEYWORD_RULES) {
    // If rule specifies category_5c, it must match
    if (rule.category_5c && !rule.category_5c.includes(cat5c)) {
      continue
    }
    if (rule.keywords.some((kw) => titleLower.includes(kw))) {
      return rule.target
    }
  }

  return "probe"
}
