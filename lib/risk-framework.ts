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
  icon: React.ComponentType<{ className?: string }>
}

export const RISK_CATEGORIES: RiskCategory[] = [
  {
    id: "management",
    label: "Management Risk",
    icon: Users,
  },
  {
    id: "collateral",
    label: "Collateral Risk / Asset Quality",
    icon: ShieldCheck,
  },
  {
    id: "market",
    label: "Market / Industry News / Bursa",
    icon: TrendingUp,
  },
  {
    id: "cashflow",
    label: "Cashflow / Capacity / CCC",
    icon: DollarSign,
  },
  {
    id: "operational",
    label: "Operational / Project Risk",
    icon: Building2,
  },
  {
    id: "fraud",
    label: "Fraud Risk",
    icon: AlertTriangle,
  },
  {
    id: "related_party",
    label: "Related Party / Fund Leakage / Dividend",
    icon: Zap,
  },
  {
    id: "financial",
    label: "Financial Analysis",
    icon: BarChart3,
  },
  {
    id: "probe",
    label: "Areas for Probe (Others)",
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
    label: "UNVERIFIABLE",
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

export const CATEGORY_STRING_TO_ID: { [key: string]: RiskCategoryId } = {
  "Management risk": "management",
  "Collateral risk / asset quality": "collateral",
  "Market / Industry news / Bursa announcements": "market",
  "Cashflow / Capacity risk / Cash conversion cycle": "cashflow",
  "Operational / Project risk": "operational",
  "Fraud risk": "fraud",
  "Related party transaction / Fund leakage / Dividend Paid": "related_party",
  "Financial analysis": "financial",
  "Areas for probe (others)": "probe",
}

export function riskCategoryToId(str: string): RiskCategoryId {
  const id = CATEGORY_STRING_TO_ID[str]
  if (!id) {
    console.warn(`Unknown risk_category: "${str}", falling back to "probe"`)
    return "probe"
  }
  return id
}
