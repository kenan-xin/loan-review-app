# v2 API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-based v2 frontend with a real SSE stream from the v2 backend via a Fly.io proxy, removing dead code and updating the UI for the v2 data schema.

**Architecture:** Next.js frontend connects to a Fly.io SSE proxy that forwards requests to `dev-genie.001.gs/smart-api/reviewer_v2`. The SSE stream is consumed in a Zustand store, transformed into a `SimulationResult`, and rendered by three layout variants (sidebar/briefing/ledger). Risk score and band are client-computed from the backend summary.

**Tech Stack:** Next.js 15, React 19, Zustand, Tailwind CSS, Recharts, Express/Fly.io (proxy)

---

### Task 1: Update types (`types/review.ts` + new `types/sse.ts`)

**Files:**
- Modify: `types/review.ts`
- Create: `types/sse.ts`

- [ ] **Step 1: Update `EvaluationRuleResult` in `types/review.ts`**

Replace the entire interface:

```ts
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
```

- [ ] **Step 2: Update `EvaluationSummary` in `types/review.ts`**

Replace the entire interface:

```ts
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
```

- [ ] **Step 3: Make ALL `CaData` fields optional and add `riskBand` to `SimulationResult` in `types/review.ts`**

Replace the entire `CaData` interface — every field gets `?`:

```ts
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
```

Change `SimulationResult` to:

```ts
export type SimulationResult = ReviewResult & {
  riskBand: "low" | "medium" | "high"
  caData: CaData
  evaluationResults: EvaluationRuleResult[]
  evaluationSummary: EvaluationSummary
  evaluationDecision: EvaluationDecision
}
```

- [ ] **Step 4: Create `types/sse.ts`**

```ts
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
```

- [ ] **Step 5: Run typecheck to see what breaks**

Run: `pnpm typecheck`
Expected: Multiple type errors in components that reference removed fields (`category_5c`, `risk_score`, `risk_band`, `by_risk_category`, `risk_summaries`). This is expected — we fix them in later tasks.

- [ ] **Step 6: Commit**

```bash
git add types/review.ts types/sse.ts
git commit -m "feat(types): update types for v2 SSE schema"
```

---

### Task 2: Clean up `lib/risk-framework.ts` — remove dead code, add `CATEGORY_STRING_TO_ID`

**Files:**
- Modify: `lib/risk-framework.ts`
- Delete: `lib/risk-score.ts`

- [ ] **Step 1: Remove `weight` from `RiskCategory` interface**

Change:
```ts
export interface RiskCategory {
  id: RiskCategoryId
  label: string
  weight: number
  icon: React.ComponentType<{ className?: string }>
}
```
To:
```ts
export interface RiskCategory {
  id: RiskCategoryId
  label: string
  icon: React.ComponentType<{ className?: string }>
}
```

- [ ] **Step 2: Remove all `weight` values from `RISK_CATEGORIES`**

In each of the 9 category objects, delete the `weight: X.X,` line. For example, change:
```ts
{
  id: "management",
  label: "Management Risk",
  weight: 1.5,
  icon: Users,
},
```
To:
```ts
{
  id: "management",
  label: "Management Risk",
  icon: Users,
},
```

- [ ] **Step 3: Delete everything from line 130 to end of file (KEYWORD_RULES, MANUAL_OVERRIDES, mapRuleToRiskCategory)**

Delete all code after `} as const` on line 128 (the closing of `RESULT_CONFIG`). Replace with the `CATEGORY_STRING_TO_ID` lookup:

```ts
export const CATEGORY_STRING_TO_ID: Record<string, RiskCategoryId> = {
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
```

- [ ] **Step 4: Delete `lib/risk-score.ts`**

Run: `rm lib/risk-score.ts`

- [ ] **Step 5: Verify no remaining weight imports**

Run: `grep -r "\.weight\|from.*risk-score" --include="*.ts" --include="*.tsx" .`
Expected: No matches

- [ ] **Step 6: Commit**

```bash
git add lib/risk-framework.ts
git rm lib/risk-score.ts
git commit -m "refactor: remove weight system and keyword mapper, add CATEGORY_STRING_TO_ID"
```

---

### Task 3: Create `lib/risk-band.ts` helper

**Files:**
- Create: `lib/risk-band.ts`

- [ ] **Step 1: Create the helper**

```ts
export type RiskBand = "low" | "medium" | "high"

export function deriveRiskBand(score: number): RiskBand {
  if (score >= 70) return "low"
  if (score >= 40) return "medium"
  return "high"
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/risk-band.ts
git commit -m "feat: add deriveRiskBand helper"
```

---

### Task 4: Rewrite transformer (`lib/simulate-review.ts`)

**Files:**
- Modify: `lib/simulate-review.ts`

- [ ] **Step 1: Replace entire file content**

```ts
import type {
  SimulationResult,
  CaData,
  EvaluationRuleResult,
  EvaluationSummary,
  EvaluationDecision,
} from "@/types/review"
import { riskCategoryToId } from "@/lib/risk-framework"
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/simulate-review.ts
git commit -m "refactor: rewrite transformer for v2 schema, compute risk score from summary"
```

---

### Task 5: Rewrite store (`store/loan-review.ts`) — SSE consumer

**Files:**
- Modify: `store/loan-review.ts`

- [ ] **Step 1: Replace entire file**

This replaces the mock delay with a real SSE consumer. Pattern follows the v1 reference at `/home/kenan/work/worktrees/update-api-zi3/store/loan-review.ts`.

```ts
import { create } from "zustand"
import type { SimulationResult } from "@/types/review"
import { transformToReviewResult } from "@/lib/simulate-review"

export type SseStage =
  | "idle"
  | "processing_document"
  | "extracting"
  | "checking"
  | "completed"

const NODE_TO_STAGE: Record<string, SseStage> = {
  response_3: "processing_document",
  response_1: "extracting",
  response_2: "checking",
}

const STAGE_ORDER: SseStage[] = [
  "processing_document",
  "extracting",
  "checking",
]

type ResultLayout = "sidebar" | "briefing" | "ledger"

let abortController: AbortController | null = null

interface LoanReviewState {
  step: 1 | 2 | 3
  applicationFile: File | null
  result: SimulationResult | null
  error: string | null
  isSubmitting: boolean
  stage: SseStage
  completedStages: Set<SseStage>
  resultLayout: ResultLayout

  setStep: (step: 1 | 2 | 3) => void
  setApplicationFile: (file: File | null) => void
  submit: () => void
  reset: () => void
  setResultLayout: (layout: ResultLayout) => void
}

export const useLoanReviewStore = create<LoanReviewState>((set, get) => ({
  step: 1,
  applicationFile: null,
  result: null,
  error: null,
  isSubmitting: false,
  stage: "idle",
  completedStages: new Set(),
  resultLayout: "sidebar",

  setStep: (step) => set({ step }),

  setApplicationFile: (file) => set({ applicationFile: file }),

  setResultLayout: (layout) => set({ resultLayout: layout }),

  submit: () => {
    const { applicationFile, isSubmitting } = get()
    if (isSubmitting || !applicationFile) return

    abortController = new AbortController()
    const { signal } = abortController

    set({
      isSubmitting: true,
      error: null,
      step: 2,
      stage: "idle",
      completedStages: new Set(),
    })

    const formData = new FormData()
    formData.append("ca", applicationFile)

    let buffer = ""

    const markStagesUpTo = (stage: SseStage) => {
      const completed = new Set<SseStage>()
      for (const s of STAGE_ORDER) {
        completed.add(s)
        if (s === stage) break
      }
      set((state) => ({
        completedStages: new Set([...state.completedStages, ...completed]),
      }))
    }

    const PROXY_BASE = process.env.NEXT_PUBLIC_PROXY_URL_V2 ?? ""
    const MAX_RETRIES = 3
    const doFetch = async (attempt = 0): Promise<Response> => {
      try {
        return await fetch(`${PROXY_BASE}/api/loan-review-v2`, {
          method: "POST",
          body: formData,
          signal,
        })
      } catch (err) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
          return doFetch(attempt + 1)
        }
        throw err
      }
    }

    doFetch()
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.text().catch(() => "")
          throw new Error(`Server error: ${response.status} ${body}`)
        }
        if (!response.body) throw new Error("No response body")

        const rdr = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await rdr.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split("\n\n")
          buffer = frames.pop() ?? ""

          for (const frame of frames) {
            const lines = frame.split("\n")
            for (const line of lines) {
              if (line.startsWith(":")) continue
              if (line.startsWith("retry:")) continue
              if (!line.startsWith("data: ")) continue

              const jsonStr = line.slice(6)
              let event: Record<string, unknown>
              try {
                event = JSON.parse(jsonStr)
              } catch {
                console.warn("[SSE] bad frame", jsonStr.slice(0, 200))
                continue
              }

              const nodeID = event.nodeID as string | undefined

              if (nodeID && NODE_TO_STAGE[nodeID]) {
                const stage = NODE_TO_STAGE[nodeID]
                markStagesUpTo(stage)
                set({ stage })
              }

              if (nodeID === "end" || event.status === "completed") {
                const output = event.output as {
                  ca: unknown
                  result: unknown
                  summary: unknown
                  decision: unknown
                }

                if (output) {
                  const result = transformToReviewResult(
                    output.ca as SimulationResult["caData"],
                    output.result as SimulationResult["evaluationResults"],
                    output.summary as SimulationResult["evaluationSummary"],
                    output.decision as SimulationResult["evaluationDecision"]
                  )

                  set({
                    result,
                    step: 3,
                    isSubmitting: false,
                    stage: "completed",
                    completedStages: new Set(STAGE_ORDER),
                  })
                }
              }
            }
          }
        }
      })
      .catch((err) => {
        if (signal.aborted) return
        console.error("SSE stream error:", err)
        set({ error: String(err.message ?? err), isSubmitting: false })
      })
  },

  reset: () => {
    abortController?.abort()
    abortController = null
    set({
      step: 1,
      applicationFile: null,
      result: null,
      error: null,
      isSubmitting: false,
      stage: "idle",
      completedStages: new Set(),
      resultLayout: "sidebar",
    })
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add store/loan-review.ts
git commit -m "feat(store): replace mock delay with real SSE consumer for v2 backend"
```

---

### Task 6: Fix `components/results/risk-item.tsx` — remove chip, add new fields

**Files:**
- Modify: `components/results/risk-item.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
"use client"

import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { RESULT_CONFIG } from "@/lib/risk-framework"
import type { EvaluationRuleResult } from "@/types/review"

interface RiskItemProps {
  readonly rule: EvaluationRuleResult
  readonly isExpanded: boolean
  readonly onToggle: () => void
}

export function RiskItem({ rule, isExpanded, onToggle }: RiskItemProps) {
  const cfg = RESULT_CONFIG[rule.result as keyof typeof RESULT_CONFIG] ?? RESULT_CONFIG["PASS"]
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                cfg.badge
              )}
            >
              {cfg.label}
            </span>
          </div>
          <span className="text-xs font-medium text-foreground">
            {rule.rule_title}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isExpanded ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pt-0 pb-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {rule.explanation}
            </p>
            {rule.action && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Action
                </span>
                <p className="mt-0.5 text-xs text-foreground">{rule.action}</p>
              </div>
            )}
            {rule.required_fields.length > 0 && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Required Fields
                </span>
                <ul className="mt-1 space-y-0.5">
                  {rule.required_fields.map((field, i) => (
                    <li key={i} className="font-mono text-[10px] text-muted-foreground">
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rule.source_evidence.length > 0 && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Source Evidence
                </span>
                <ul className="mt-1 space-y-0.5">
                  {rule.source_evidence.map((evidence, i) => (
                    <li key={i} className="text-[10px] leading-relaxed text-muted-foreground">
                      {evidence}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rule.source_file && (
              <div className="mt-2 rounded bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Source File
                </span>
                <p className="mt-0.5 text-xs text-foreground">{rule.source_file}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/results/risk-item.tsx
git commit -m "feat(risk-item): remove secondary chip, add source_evidence/required_fields/source_file sections"
```

---

### Task 7: Fix `components/results/risk-category-section.tsx` — update key, remove N/A

**Files:**
- Modify: `components/results/risk-category-section.tsx`

- [ ] **Step 1: Update `getRuleKey` and `RULE_STATUS_ORDER`**

Change:
```ts
const RULE_STATUS_ORDER = {
  FAIL: 0,
  WARNING: 1,
  PASS: 2,
  MISSING: 3,
  "N/A": 4,
} as const

function getRuleKey(rule: EvaluationRuleResult) {
  return [rule.rule_title, rule.category_5c, rule.result].join("::")
}
```
To:
```ts
const RULE_STATUS_ORDER = {
  FAIL: 0,
  WARNING: 1,
  PASS: 2,
  MISSING: 3,
} as const

function getRuleKey(rule: EvaluationRuleResult) {
  return [rule.rule_title, rule.risk_category, rule.result].join("::")
}
```

- [ ] **Step 2: Update `countsLabel` to remove missingCount shorthand**

Change:
```ts
const countsLabel = [
  `${failCount}F`,
  `${warnCount}W`,
  `${passCount}P`,
  `${missingCount}U`,
].join(" · ")
```
To:
```ts
const countsLabel = [
  `${failCount}F`,
  `${warnCount}W`,
  `${passCount}P`,
  `${missingCount}UV`,
].join(" · ")
```

- [ ] **Step 3: Commit**

```bash
git add components/results/risk-category-section.tsx
git commit -m "fix(risk-category-section): update key to use risk_category, remove N/A from sort order"
```

---

### Task 8: Fix `components/results/risk-panel.tsx` — category grouping + show all 9

**Files:**
- Modify: `components/results/risk-panel.tsx`

- [ ] **Step 1: Update category grouping and remove empty guard**

Change:
```ts
import { RISK_CATEGORIES } from "@/lib/risk-framework"
import type { EvaluationRuleResult, RiskCategoryId } from "@/types/review"
```
To:
```ts
import { RISK_CATEGORIES, riskCategoryToId } from "@/lib/risk-framework"
import type { EvaluationRuleResult, RiskCategoryId } from "@/types/review"
```

Change the `rulesByCategory` loop from:
```ts
const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
for (const cat of RISK_CATEGORIES) {
  rulesByCategory[cat.id] = rules.filter((r) => r.risk_category === cat.id)
}
```
To:
```ts
const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
for (const cat of RISK_CATEGORIES) {
  rulesByCategory[cat.id] = rules.filter(
    (r) => riskCategoryToId(r.risk_category) === cat.id
  )
}
```

Change the category rendering from:
```tsx
{RISK_CATEGORIES.map((cat, catIndex) => {
  const catRules = rulesByCategory[cat.id]
  if (catRules.length === 0) return null
  return (
```
To:
```tsx
{RISK_CATEGORIES.map((cat, catIndex) => {
  const catRules = rulesByCategory[cat.id]
  return (
```
(Remove the `if (catRules.length === 0) return null` guard.)

- [ ] **Step 2: Commit**

```bash
git add components/results/risk-panel.tsx
git commit -m "fix(risk-panel): use riskCategoryToId for grouping, show all 9 categories"
```

---

### Task 9: Fix `components/results/result-sidebar.tsx` — use computed riskBand/score

**Files:**
- Modify: `components/results/result-sidebar.tsx`

- [ ] **Step 1: Update imports and add `riskCategoryToId`**

Change:
```ts
import { RESULT_CONFIG, RISK_CATEGORIES } from "@/lib/risk-framework"
import type {
  EvaluationRuleResult,
  RiskCategoryId,
  RiskCategorySummary,
} from "@/types/review"
```
To:
```ts
import { RESULT_CONFIG, RISK_CATEGORIES, riskCategoryToId } from "@/lib/risk-framework"
import type {
  EvaluationSummary,
  EvaluationDecision,
  RiskCategoryId,
} from "@/types/review"
```

- [ ] **Step 2: Update props interface — replace `evaluationSummary` with direct score/band + summary**

The sidebar currently reads `evaluationSummary.risk_score`, `evaluationSummary.risk_band`, and `evaluationSummary.by_risk_category`. We need to pass `riskScore`, `riskBand`, and the raw `evaluationSummary` (for totals and `by_category`).

Change the `ResultSidebarProps` to accept the whole result:

```ts
interface ResultSidebarProps {
  readonly basicInfo: Record<string, unknown>
  readonly evaluationSummary: EvaluationSummary
  readonly evaluationDecision: EvaluationDecision
  readonly riskScore: number
  readonly riskBand: "low" | "medium" | "high"
}
```

- [ ] **Step 3: Update the component body**

Change the destructured values from:
```ts
const byRiskCategory = evaluationSummary.by_risk_category
const riskScore = evaluationSummary.risk_score ?? 0
const riskBand = evaluationSummary.risk_band ?? "medium"
```
To:
```ts
// riskScore and riskBand come from props (client-computed)
```

And update the `Risk Categories` section to read from `evaluationSummary.by_category` instead of `evaluationSummary.by_risk_category`. Change:
```tsx
{RISK_CATEGORIES.map((cat) => {
  const stats = byRiskCategory[cat.id]
  if (!stats || stats.total === 0) return null
  const total = stats.total
```
To:
```tsx
{RISK_CATEGORIES.map((cat) => {
  // Find the by_category entry whose verbose key maps to this cat.id
  const byCatEntry = Object.entries(evaluationSummary.by_category).find(
    ([key]) => riskCategoryToId(key) === cat.id
  )
  if (!byCatEntry) return null
  const [_, stats] = byCatEntry
  const total = stats.fail + stats.warning + stats.pass + stats.missing
  if (total === 0) return null
```

And update all `stats.fail`, `stats.warning`, `stats.pass`, `stats.missing` references below (they keep the same names since `by_category` entries already have `fail/warning/pass/missing`).

- [ ] **Step 4: Update the call site in `components/results-step.tsx`**

In `results-step.tsx`, the sidebar is called like:
```tsx
<ResultSidebar
  basicInfo={basicInfo}
  evaluationSummary={evaluationSummary}
  evaluationDecision={evaluationDecision}
/>
```

Change to:
```tsx
<ResultSidebar
  basicInfo={basicInfo}
  evaluationSummary={evaluationSummary}
  evaluationDecision={evaluationDecision}
  riskScore={result.riskScore}
  riskBand={result.riskBand}
/>
```

- [ ] **Step 5: Commit**

```bash
git add components/results/result-sidebar.tsx components/results-step.tsx
git commit -m "fix(sidebar): use client-computed riskScore/riskBand, read by_category via CATEGORY_STRING_TO_ID"
```

---

### Task 10: Invert gauge in `components/results/risk-meter.tsx`

**Files:**
- Modify: `components/results/risk-meter.tsx`

- [ ] **Step 1: Invert `TRACK_DATA`**

Change:
```ts
const TRACK_DATA = [
  { name: "low", value: 30, color: "var(--color-emerald-400)" },
  { name: "medium", value: 30, color: "var(--color-amber-300)" },
  { name: "high", value: 40, color: "var(--color-red-400)" },
]
```
To:
```ts
const TRACK_DATA = [
  { name: "high", value: 40, color: "var(--color-red-400)" },
  { name: "medium", value: 30, color: "var(--color-amber-300)" },
  { name: "low", value: 30, color: "var(--color-emerald-400)" },
]
```

This puts red on the left (low pass rate = bad) and green on the right (high pass rate = good).

- [ ] **Step 2: Commit**

```bash
git add components/results/risk-meter.tsx
git commit -m "fix(risk-meter): invert gauge zones so green=right (high pass rate=good)"
```

---

### Task 11: Fix `components/results/layout-briefing.tsx` — update for v2 schema

**Files:**
- Modify: `components/results/layout-briefing.tsx`

This file references `evaluationSummary.risk_band`, `evaluationSummary.risk_score`, `evaluationSummary.by_risk_category`, `evaluationSummary.risk_summaries`, `rule.category_5c`, and `r.risk_category === cat.id`.

- [ ] **Step 1: Update imports**

Change:
```ts
import { RISK_CATEGORIES } from "@/lib/risk-framework"
import type {
  EvaluationRuleResult,
  RiskCategoryId,
  RiskCategorySummary,
} from "@/types/review"
```
To:
```ts
import { RISK_CATEGORIES, riskCategoryToId } from "@/lib/risk-framework"
import type {
  EvaluationRuleResult,
  RiskCategoryId,
} from "@/types/review"
```

- [ ] **Step 2: Fix `getRuleKey`**

Change:
```ts
function getRuleKey(rule: EvaluationRuleResult) {
  return [rule.rule_title, rule.category_5c, rule.result].join("::")
}
```
To:
```ts
function getRuleKey(rule: EvaluationRuleResult) {
  return [rule.rule_title, rule.risk_category, rule.result].join("::")
}
```

- [ ] **Step 3: Fix `RULE_STATUS_ORDER` — remove N/A**

Change:
```ts
const RULE_STATUS_ORDER = {
  FAIL: 0,
  WARNING: 1,
  PASS: 2,
  MISSING: 3,
  "N/A": 4,
} as const
```
To:
```ts
const RULE_STATUS_ORDER = {
  FAIL: 0,
  WARNING: 1,
  PASS: 2,
  MISSING: 3,
} as const
```

- [ ] **Step 4: Fix `CategoryRow` props — use raw category stats instead of `RiskCategorySummary`**

Change the `CategoryRowProps` interface from using `RiskCategorySummary` to inline stats:
```ts
interface CategoryRowProps {
  readonly index: number
  readonly categoryId: RiskCategoryId
  readonly rules: EvaluationRuleResult[]
  readonly catStats: { fail: number; warning: number; pass: number; missing: number }
  readonly aiSummary: string
  readonly activeFilters: Set<string>
}
```

Update `CategoryRow` to use `catStats` instead of `summary`:
- Change `summary.total` to `catStats.fail + catStats.warning + catStats.pass + catStats.missing`
- Change `summary.pass` to `catStats.pass`, etc.
- Remove `passRatio` and `badgeStyle` computed from `summary.total`

- [ ] **Step 5: Fix `rulesByCategory` grouping**

Change:
```ts
const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
for (const cat of RISK_CATEGORIES) {
  rulesByCategory[cat.id] = evaluationResults.filter(
    (r) => r.risk_category === cat.id
  )
}
```
To:
```ts
const rulesByCategory: Record<string, EvaluationRuleResult[]> = {}
for (const cat of RISK_CATEGORIES) {
  rulesByCategory[cat.id] = evaluationResults.filter(
    (r) => riskCategoryToId(r.risk_category) === cat.id
  )
}
```

- [ ] **Step 6: Fix header — use `result.riskScore` and `result.riskBand` instead of `evaluationSummary.risk_score` / `evaluationSummary.risk_band`**

Change:
```tsx
{evaluationSummary.risk_score}
```
To:
```tsx
{result.riskScore}
```

Change:
```tsx
const bandStyle = getRiskBandStyle(evaluationSummary.risk_band, c)
```
To:
```tsx
const bandStyle = getRiskBandStyle(result.riskBand, c)
```

Change:
```tsx
{evaluationSummary.risk_band}
```
To:
```tsx
{result.riskBand}
```

- [ ] **Step 7: Fix `flagCategories` — use `by_category` via `riskCategoryToId`**

Change:
```ts
const flagCategories = RISK_CATEGORIES.filter((cat) => {
  const catSummary = evaluationSummary.by_risk_category[cat.id]
  return catSummary && (catSummary.fail > 0 || catSummary.warning > 0)
})
```
To:
```ts
const flagCategories = RISK_CATEGORIES.filter((cat) => {
  const entry = Object.entries(evaluationSummary.by_category).find(
    ([key]) => riskCategoryToId(key) === cat.id
  )
  if (!entry) return false
  return entry[1].fail > 0 || entry[1].warning > 0
})
```

- [ ] **Step 8: Fix `visibleCategories` — show all categories, not just those with rules**

Change:
```ts
const visibleCategories = RISK_CATEGORIES.filter((cat) => {
  const catRules = rulesByCategory[cat.id]
  if (catRules.length === 0) return false
  if (activeFilters.size === 0) return true
  return catRules.some((r) => activeFilters.has(r.result))
})
```
To:
```ts
const visibleCategories = RISK_CATEGORIES.filter((cat) => {
  if (activeFilters.size === 0) return true
  const catRules = rulesByCategory[cat.id]
  return catRules.some((r) => activeFilters.has(r.result))
})
```

- [ ] **Step 9: Fix category rendering — use `by_category` via lookup and placeholder AI summary**

Replace:
```tsx
{visibleCategories.map((cat) => {
  const catSummary = evaluationSummary.by_risk_category[cat.id]
  if (!catSummary) return null
  return (
    <CategoryRow
      key={cat.id}
      index={RISK_CATEGORIES.indexOf(cat) + 1}
      categoryId={cat.id as RiskCategoryId}
      rules={rulesByCategory[cat.id]}
      summary={catSummary}
      aiSummary={evaluationSummary.risk_summaries[cat.id] ?? ""}
      activeFilters={activeFilters}
    />
  )
})}
```
With:
```tsx
{visibleCategories.map((cat) => {
  const entry = Object.entries(evaluationSummary.by_category).find(
    ([key]) => riskCategoryToId(key) === cat.id
  )
  const catStats = entry?.[1] ?? { fail: 0, warning: 0, pass: 0, missing: 0 }
  return (
    <CategoryRow
      key={cat.id}
      index={RISK_CATEGORIES.indexOf(cat) + 1}
      categoryId={cat.id as RiskCategoryId}
      rules={rulesByCategory[cat.id]}
      catStats={catStats}
      aiSummary="No AI summary available yet."
      activeFilters={activeFilters}
    />
  )
})}
```

- [ ] **Step 10: Commit**

```bash
git add components/results/layout-briefing.tsx
git commit -m "fix(layout-briefing): update for v2 schema, use client-computed score/band, read by_category via lookup"
```

---

### Task 12: Fix `components/results/layout-ledger.tsx` — same pattern as briefing

**Files:**
- Modify: `components/results/layout-ledger.tsx`

Apply the exact same set of changes as Task 11 to `layout-ledger.tsx`:

- [ ] **Step 1: Update imports** — add `riskCategoryToId`, remove `RiskCategorySummary`

- [ ] **Step 2: Fix `getRuleKey`** — `rule.category_5c` → `rule.risk_category`

- [ ] **Step 3: Fix `RULE_STATUS_ORDER`** — remove `"N/A": 4`

- [ ] **Step 4: Fix `LedgerRow` props** — `RiskCategorySummary` → inline `{ fail, warning, pass, missing }`

- [ ] **Step 5: Fix `rulesByCategory`** — use `riskCategoryToId(r.risk_category)`

- [ ] **Step 6: Fix header** — `evaluationSummary.risk_score` → `result.riskScore`, `evaluationSummary.risk_band` → `result.riskBand`

- [ ] **Step 7: Fix `visibleCategories`** — remove empty guard (show all 9)

- [ ] **Step 8: Fix ledger row rendering** — use `by_category` via lookup, placeholder AI summary

- [ ] **Step 9: Commit**

```bash
git add components/results/layout-ledger.tsx
git commit -m "fix(layout-ledger): update for v2 schema, same pattern as briefing"
```

---

### Task 13: Fix `components/processing-step.tsx` — 4-stage SSE stepper

**Files:**
- Modify: `components/processing-step.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SseStage } from "@/store/loan-review"
import { useLoanReviewStore } from "@/store/loan-review"

interface ProcessingStepProps {
  error: string | null
  onRetry: () => void
}

const STAGES: Array<{ id: SseStage; label: string }> = [
  { id: "processing_document", label: "Processing document" },
  { id: "extracting", label: "Extracting" },
  { id: "checking", label: "Checking" },
  { id: "completed", label: "Completed" },
]

const STAGE_ORDER: SseStage[] = [
  "processing_document",
  "extracting",
  "checking",
  "completed",
]

function AnimatedDots() {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 4 ? 1 : prev + 1))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return <span className="inline-block w-6 text-left">{".".repeat(dots)}</span>
}

export function ProcessingStep({ error, onRetry }: ProcessingStepProps) {
  const { stage, completedStages, isSubmitting } = useLoanReviewStore()

  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (error) return
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [error])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <span className="text-2xl text-destructive">!</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold">Review Failed</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
        <Button onClick={onRetry} className="mt-6">
          Try Again
        </Button>
      </div>
    )
  }

  if (!isSubmitting && stage !== "completed") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="size-10 animate-spin text-primary" />
        <h3 className="mt-4 text-lg font-semibold">
          AI is reviewing the application
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Please wait while we analyse the documents
        </p>
      </div>
    )
  }

  const currentStageIndex = stage === "idle" ? -1 : STAGE_ORDER.indexOf(stage)
  const activeStageIndex = Math.max(0, currentStageIndex)

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-lg font-semibold">Processing Application</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Please wait while we analyse the documents
      </p>

      <div className="mt-6 w-full max-w-md rounded-lg border p-4 text-left shadow-sm">
        {/* Current active step */}
        {currentStageIndex >= 0 && currentStageIndex < STAGES.length - 1 && (
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {STAGES[activeStageIndex].label}
              <AnimatedDots />
            </span>
          </div>
        )}

        {/* Completed steps */}
        {completedStages.size > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            {STAGES.filter(
              (s) =>
                s.id !== "completed" &&
                completedStages.has(s.id) &&
                STAGE_ORDER.indexOf(s.id) < activeStageIndex
            ).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Check className="size-3 shrink-0 text-muted-foreground/50" />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          Step {Math.min(activeStageIndex + 1, STAGES.length)} of {STAGES.length}
        </div>
      </div>

      <div className="mt-4 font-mono text-sm">
        <span className="text-muted-foreground">Elapsed: </span>
        <span className="font-medium">{formatTime(elapsed)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `app/page.tsx` — remove debug skip and update ProcessingStep props**

Remove lines 14-20 (`DEBUG_SKIP_PROCESSING` const and `loadSimulationData`/`transformToReviewResult` imports).

Remove the entire `useEffect` block at lines 63-85 (the debug skip processing effect).

Update the `ProcessingStep` component usage from:
```tsx
<ProcessingStep
  isSubmitting={isSubmitting}
  error={error}
  processingProgress={processingProgress}
  onRetry={handleRetry}
/>
```
To:
```tsx
<ProcessingStep
  error={error}
  onRetry={handleRetry}
/>
```

Remove `processingProgress` from the store destructuring and from `handleRetry`'s `setState` call.

- [ ] **Step 3: Commit**

```bash
git add components/processing-step.tsx app/page.tsx
git commit -m "feat(processing): replace fake progress with 4-stage SSE stepper, remove DEBUG_SKIP_PROCESSING"
```

---

### Task 14: Fix `components/results-step.tsx` — update riskSummaries

**Files:**
- Modify: `components/results-step.tsx`

- [ ] **Step 1: Replace `riskSummaries` derivation**

Change:
```ts
const riskSummaries = evaluationSummary.risk_summaries ?? {}
```
To:
```ts
import { RISK_CATEGORIES } from "@/lib/risk-framework"
// ... inside the component:
const riskSummaries = Object.fromEntries(
  RISK_CATEGORIES.map((c) => [c.id, "No AI summary available yet."])
)
```

(Move the `RISK_CATEGORIES` import to the top of the file if not already there.)

- [ ] **Step 2: Commit**

```bash
git add components/results-step.tsx
git commit -m "fix(results-step): use placeholder AI summaries instead of mock-only risk_summaries"
```

---

### Task 15: Delete dead files and mock data

**Files:**
- Delete: `app/api/loan-review/route.ts`
- Delete: `app/api/loan-review/status/route.ts`
- Delete: `lib/job-store.ts`
- Delete: `lib/parse-response.ts`
- Delete: `app/data/ca_extracted_rh_group.json`
- Delete: `app/data/evaluation_report_rh_group.json`

- [ ] **Step 1: Delete files**

```bash
git rm app/api/loan-review/route.ts app/api/loan-review/status/route.ts lib/job-store.ts lib/parse-response.ts app/data/ca_extracted_rh_group.json app/data/evaluation_report_rh_group.json
```

- [ ] **Step 2: Remove dead imports from `app/page.tsx` if any remain**

Check for any remaining references to `loadSimulationData` or `transformToReviewResult` in `app/page.tsx`. If the imports are still there (from the debug block), remove them. This should already be done in Task 13, but verify.

Run: `grep -n "loadSimulationData\|simulate-review\|DEBUG_SKIP" app/page.tsx`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete mock data, polling routes, and dead utility files"
```

---

### Task 16: Create Fly.io proxy

**Files:**
- Create: `proxy/package.json`
- Create: `proxy/tsconfig.json`
- Create: `proxy/src/server.ts`
- Create: `proxy/src/logger.ts`
- Create: `proxy/fly.toml`
- Create: `.env.example`

Copy the proxy from the v1 worktree and modify for v2.

- [ ] **Step 1: Copy v1 proxy (excluding node_modules)**

```bash
rsync -av --exclude='node_modules' /home/kenan/work/worktrees/update-api-zi3/proxy/ proxy/
```

- [ ] **Step 2: Update `proxy/fly.toml`**

Change `app = 'loan-review-proxy'` to `app = 'loan-review-proxy-v2'`.

- [ ] **Step 3: Update `proxy/package.json`**

Change `"name": "loan-review-proxy"` to `"name": "loan-review-proxy-v2"`.

- [ ] **Step 4: Update `proxy/src/server.ts`**

Change:
```ts
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL ?? "https://dev-genie.001.gs/smart-api/reviewer"
```
To:
```ts
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL ?? "https://dev-genie.001.gs/smart-api/reviewer_v2"
```

Change:
```ts
app.post("/api/loan-review", upload.single("ca"), async (req, res) => {
  const context = "POST /api/loan-review"
```
To:
```ts
app.post("/api/loan-review-v2", upload.single("ca"), async (req, res) => {
  const context = "POST /api/loan-review-v2"
```

- [ ] **Step 5: Install proxy dependencies**

```bash
cd proxy && pnpm install && cd ..
```

- [ ] **Step 6: Create `.env.example` at repo root**

```
NEXT_PUBLIC_PROXY_URL_V2=https://loan-review-proxy-v2.fly.dev
```

- [ ] **Step 7: Commit**

```bash
git add proxy/ .env.example
git commit -m "feat(proxy): add Fly.io SSE proxy for v2 backend"
```

---

### Task 17: Final typecheck + lint pass

**Files:**
- Various (fix any remaining issues)

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Fix any remaining type errors. Common things to check:
- `RiskCategorySummary` imports that weren't cleaned up
- `category_5c` references that were missed
- `evaluationSummary.risk_score` / `risk_band` / `by_risk_category` / `risk_summaries` references
- `processingProgress` prop references in `ProcessingStep`

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve remaining typecheck and lint errors"
```

---

### Task 18: Verify build and manual smoke test

- [ ] **Step 1: Run dev build**

```bash
pnpm dev
```

- [ ] **Step 2: Verify processing view renders with 4-stage stepper**

Open the app, upload a PDF, confirm the processing view shows stage labels.

- [ ] **Step 3: Verify results view renders after completion**

Confirm: sidebar counts, RiskMeter, decision sections, category sections, rule items with new expandable fields.

- [ ] **Step 4: Verify all three layouts work**

Switch between sidebar, briefing, and ledger layouts. Confirm all render without errors.
