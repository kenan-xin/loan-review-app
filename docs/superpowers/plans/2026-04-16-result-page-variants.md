# Result Page Design Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a design switcher and two new result page layouts (Briefing Sheet + Structured Ledger) alongside the existing sidebar layout.

**Architecture:** ResultsStep renders a design-switcher UI and conditionally renders one of three layout components (LayoutA, LayoutB, LayoutC). All three share the same data props and reuse existing child components (RiskItem, CaDataPanel, ChatBubble). Design preference persisted in localStorage.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, Google Fonts (next/font/google)

---

### Task 1: Add design layout preference to store

**Files:**

- Modify: `store/loan-review.ts`

- [ ] **Step 1: Read the current store file**

Read `store/loan-review.ts` to find the existing state interface and store definition.

- [ ] **Step 2: Add `resultLayout` field to state**

Add a `resultLayout` field with type `"sidebar" | "briefing" | "ledger"` to the store state. Default to `"sidebar"`. Persist to localStorage under key `"result-layout"`.

```ts
// In the state interface, add:
resultLayout: "sidebar" | "briefing" | "ledger"

// In the store definition, after existing state:
resultLayout: typeof window !== "undefined"
  ? (localStorage.getItem("result-layout") as "sidebar" | "briefing" | "ledger") ?? "sidebar"
  : "sidebar",

// Add action:
setResultLayout: (layout: "sidebar" | "briefing" | "ledger") =>
    set((state) => {
      localStorage.setItem("result-layout", layout)
      return { ...state, resultLayout: layout }
    }),
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add store/loan-review.ts
git commit -m "feat: add result layout preference to store with localStorage persistence"
```

### Task 2: Add Google Fonts for Design B and C

**Files:**

- Modify: `app/layout.tsx`

- [ ] **Step 1: Add font imports**

Add `Source_Serif_4`, `Source_Sans_3`, `Manrope`, and `JetBrains_Mono` imports via `next/font/google`. Only Design B needs Source Serif 4 + Source Sans 3. Only Design C needs Manrope + JetBrains Mono. Import all four and assign CSS variables.

```ts
import {
  Source_Serif_4,
  Source_Sans_3,
  Manrope,
  JetBrains_Mono,
} from "next/font/google"

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif-4",
  display: "swap",
})

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans-3",
  display: "swap",
})

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-display",
  display: "swap",
})
```

- [ ] **Step 2: Add variables to `<html>` className**

Add the new font variables to the `cn()` call in `<html>`:

```tsx
className={cn(
  "antialiased",
  fontMono.variable,
  jetbrainsMono.variable,
  "font-sans",
  publicSans.variable,
  sourceSans3.variable,
  sourceSerif4.variable,
  interHeading.variable,
  manrope.variable,
)}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add Google Fonts for Design B and C layouts"
```

### Task 3: Extract shared result layout props and helpers

**Files:**

- Create: `components/results/types.ts`

- [ ] **Step 1: Create shared types file**

Extract the common props interface that all three layouts need. This avoids duplicating prop drilling.

```ts
import type { SimulationResult } from "@/types/review"

export type ResultLayout = "sidebar" | "briefing" | "ledger"

export interface ResultLayoutProps {
  readonly result: SimulationResult
  readonly activeTab: "ca-data" | "risks"
  readonly onTabChange: (tab: "ca-data" | "risks") => void
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/results/types.ts
git commit -m "feat: extract shared result layout types"
```

### Task 4: Add design switcher to ResultHeader

**Files:**

- Modify: `components/results/result-header.tsx`

- [ ] **Step 1: Add layout switcher UI**

Add a three-button toggle to the header that lets users pick Layout A, B, or C. Use the store's `resultLayout` and `setResultLayout`.

```tsx
"use client"

import { useLoanReviewStore } from "@/store/loan-review"
import type { ResultLayout } from "./types"

interface ResultHeaderProps {
  readonly layout: ResultLayout
  readonly onLayoutChange: (layout: ResultLayout) => void
}

const LAYOUT_OPTIONS: Array<{ value: ResultLayout; label: string }> = [
  { value: "sidebar", label: "Layout A" },
  { value: "briefing", label: "Layout B" },
  { value: "ledger", label: "Layout C" },
]

export function ResultHeader({ layout, onLayoutChange }: ResultHeaderProps) {
  return (
    <div className="mb-3 flex shrink-0 items-center justify-between">
      <h2 className="text-base font-semibold">Review Results</h2>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onLayoutChange(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                layout === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <a
          href="https://forms.cloud.microsoft/r/E56ubSr1wt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:bg-blue-700 hover:shadow-lg active:scale-95"
        >
          Share Feedback →
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/results/result-header.tsx
git commit -m "feat: add design switcher to result header"
```

### Task 5: Create shared sub-components used by B and C

**Files:**

- Create: `components/results/shared/status-filter-chips.tsx`
- Create: `components/results/shared/findings-section.tsx`
- Create: `components/results/shared/category-stacked-bar.tsx`

- [ ] **Step 1: Create StatusFilterChips**

Extract the filter chip logic from `risk-panel.tsx` into a reusable component. The existing RiskPanel already has this logic — we need a standalone version for B and C.

```tsx
"use client"

import { cn } from "@/lib/utils"
import { RESULT_CONFIG } from "@/lib/risk-framework"

type StatusFilter = "ALL" | "FAIL" | "WARNING" | "PASS" | "MISSING"

interface StatusFilterChipsProps {
  readonly activeFilters: Set<string>
  readonly onToggle: (value: StatusFilter) => void
  readonly total: number
}

const STATUS_OPTIONS: Array<{
  value: StatusFilter
  key: keyof typeof RESULT_CONFIG
  label: string
}> = [
  { value: "ALL", key: "FAIL", label: "All" },
  { value: "FAIL", key: "FAIL", label: "FAIL" },
  { value: "WARNING", key: "WARNING", label: "WARN" },
  { value: "MISSING", key: "MISSING", label: "MISS" },
  { value: "PASS", key: "PASS", label: "PASS" },
]

export function StatusFilterChips({
  activeFilters,
  onToggle,
  total,
}: StatusFilterChipsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b px-4 py-2">
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onToggle(opt.value)}
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium transition-colors",
            opt.value === "ALL"
              ? activeFilters.size === 0
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
              : activeFilters.has(opt.value)
                ? cn("text-white", {
                    "bg-red-500": opt.value === "FAIL",
                    "bg-amber-400 text-white": opt.value === "WARNING",
                    "bg-emerald-500": opt.value === "PASS",
                    "bg-slate-500": opt.value === "MISSING",
                  })
                : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {opt.label}
        </button>
      ))}
      <span className="ml-auto font-mono text-xs text-muted-foreground">
        {total} items
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create FindingsSection**

A collapsible section with a colored dot list, used for Key Concerns, Key Strengths, Required Conditions, Missing Information.

```tsx
"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

type DotColor = "red" | "green" | "amber" | "grey"

const DOT_COLORS: Record<DotColor, string> = {
  red: "bg-red-500",
  green: "bg-emerald-500",
  amber: "bg-amber-400",
  grey: "bg-slate-400",
}

interface FindingsSectionProps {
  readonly title: string
  readonly items: string[]
  readonly dotColor: DotColor
  readonly defaultOpen?: boolean
}

export function FindingsSection({
  title,
  items,
  dotColor,
  defaultOpen = false,
}: FindingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
      >
        <span className="text-xs font-medium text-foreground">{title}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {items.length} items
          </span>
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 px-4 pb-3">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs leading-relaxed"
              >
                <span
                  className={`mt-1.5 size-[5px] shrink-0 rounded-full ${DOT_COLORS[dotColor]}`}
                />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CategoryStackedBar**

A thin horizontal stacked bar showing pass/warn/fail/missing proportions. Used by both B and C.

```tsx
interface CategoryStackedBarProps {
  readonly fail: number
  readonly warning: number
  readonly pass: number
  readonly missing: number
  readonly className?: string
}

export function CategoryStackedBar({
  fail,
  warning,
  pass,
  missing,
  className = "w-16",
}: CategoryStackedBarProps) {
  const total = fail + warning + pass + missing
  if (total === 0) return null
  return (
    <div
      className={`flex h-1.5 gap-px overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      {fail > 0 && (
        <div
          className="bg-red-500"
          style={{ width: `${(fail / total) * 100}%` }}
        />
      )}
      {warning > 0 && (
        <div
          className="bg-amber-400"
          style={{ width: `${(warning / total) * 100}%` }}
        />
      )}
      {pass > 0 && (
        <div
          className="bg-emerald-500"
          style={{ width: `${(pass / total) * 100}%` }}
        />
      )}
      {missing > 0 && (
        <div
          className="bg-slate-300 dark:bg-slate-600"
          style={{ width: `${(missing / total) * 100}%` }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/results/shared/
git commit -m "feat: add shared result sub-components (filter chips, findings section, stacked bar)"
```

### Task 6: Create Design B — Briefing Sheet layout

**Files:**

- Create: `components/results/layout-briefing.tsx`

- [ ] **Step 1: Implement LayoutBriefing component**

Single-column layout. Uses `font-serif-4` and `font-sans-3` CSS variables. Follows the spec structure: masthead → score strip → AI briefing → attention flags → filter chips → 9 category rows (expandable) → findings sections.

Key implementation details:

- Use `RISK_CATEGORIES` from `lib/risk-framework` for the 9 categories
- Use `evaluationSummary.by_risk_category` for per-category stats
- Each category row is clickable and expands to show AI summary + individual `RiskItem` components
- Use `FindingsSection` for concerns, strengths, conditions, missing info
- Use `StatusFilterChips` for filtering
- Filter logic: same as RiskPanel — filter rules by active filter set

The component should accept `ResultLayoutProps` and render the full layout including tabs. On the "ca-data" tab, render `CaDataPanel` (same as Design A).

```tsx
"use client"

import { useState } from "react"
import { RISK_CATEGORIES } from "@/lib/risk-framework"
import type { ResultLayoutProps } from "./types"
import { CaDataPanel } from "./ca-data-panel"
import { RiskItem } from "./risk-item"
import { StatusFilterChips } from "./shared/status-filter-chips"
import { FindingsSection } from "./shared/findings-section"
import { CategoryStackedBar } from "./shared/category-stacked-bar"

type StatusFilter = "ALL" | "FAIL" | "WARNING" | "PASS" | "MISSING"

export function LayoutBriefing({
  result,
  activeTab,
  onTabChange,
}: ResultLayoutProps) {
  // ... implementation following spec structure
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/results/layout-briefing.tsx
git commit -m "feat: add Design B Briefing Sheet layout"
```

### Task 7: Create Design C — Structured Ledger layout

**Files:**

- Create: `components/results/layout-ledger.tsx`

- [ ] **Step 1: Implement LayoutLedger component**

Tabular layout. Uses `font-manrope` and `--font-mono-display` CSS variables. Follows spec structure: compact top bar → tabs → side-by-side AI briefing + stats → filter chips → 9 ledger rows (expandable) → findings sections.

Key differences from Design B:

- Top bar is a single row: group name + monospace CA ref badge + risk score pill
- Summary header is a 2-column grid on desktop (AI briefing left, stats right), stacks on mobile
- Category rows use a CSS grid: # | Category | Summary | Bar | Ratio
- Problem rows get background tint (`bg-red-50`, `bg-amber-50`, `bg-slate-50`)
- Uses `font-mono-display` for numbers and ratios (e.g., "5 / 5", "4 / 9")
- Mobile: hide summary/bar columns, show full category name

```tsx
"use client"

import { useState } from "react"
import { RISK_CATEGORIES } from "@/lib/risk-framework"
import type { ResultLayoutProps } from "./types"
import { CaDataPanel } from "./ca-data-panel"
import { RiskItem } from "./risk-item"
import { StatusFilterChips } from "./shared/status-filter-chips"
import { FindingsSection } from "./shared/findings-section"
import { CategoryStackedBar } from "./shared/category-stacked-bar"

export function LayoutLedger({
  result,
  activeTab,
  onTabChange,
}: ResultLayoutProps) {
  // ... implementation following spec structure
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/results/layout-ledger.tsx
git commit -m "feat: add Design C Structured Ledger layout"
```

### Task 8: Wire design switcher into ResultsStep

**Files:**

- Modify: `components/results-step.tsx`

- [ ] **Step 1: Update ResultsStep to use layout switcher**

Replace the current hardcoded two-column layout with conditional rendering based on `resultLayout` from the store. Import and use the three layout components plus the updated header with switcher.

```tsx
"use client"

import { useState } from "react"
import { useLoanReviewStore } from "@/store/loan-review"
import type { ResultLayout } from "@/components/results/types"
import { ResultHeader } from "./results/result-header"
import { ResultSidebar } from "./results/result-sidebar"
import { RiskPanel } from "./results/risk-panel"
import { CaDataPanel } from "./results/ca-data-panel"
import { LayoutBriefing } from "./results/layout-briefing"
import { LayoutLedger } from "./results/layout-ledger"

interface ResultsStepProps {
  readonly result: SimulationResult
  readonly onStartNew?: () => void
}

export function ResultsStep({ result }: ResultsStepProps) {
  const [activeTab, setActiveTab] = useState<"ca-data" | "risks">("risks")
  const { resultLayout, setResultLayout } = useLoanReviewStore()

  const { caData, evaluationResults, evaluationSummary, evaluationDecision } =
    result
  const basicInfo = caData.A_basic_information as Record<string, unknown>
  const riskSummaries = evaluationSummary.risk_summaries ?? {}

  const layoutProps = {
    result,
    activeTab,
    onTabChange: setActiveTab,
  }

  return (
    <div className="flex h-full flex-col">
      <ResultHeader layout={resultLayout} onLayoutChange={setResultLayout} />

      {resultLayout === "sidebar" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[360px_1fr]">
          <ResultSidebar
            basicInfo={basicInfo}
            evaluationSummary={evaluationSummary}
            evaluationDecision={evaluationDecision}
          />
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
            <div role="tablist" className="flex shrink-0 border-b">
              {(["ca-data", "risks"] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={
                    activeTab === tab
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }
                >
                  {tab === "risks" ? "Risks" : "CA Data"}
                </button>
              ))}
            </div>
            {activeTab === "risks" && (
              <RiskPanel
                rules={evaluationResults}
                riskSummaries={riskSummaries}
              />
            )}
            {activeTab === "ca-data" && <CaDataPanel caData={caData} />}
          </div>
        </div>
      )}

      {resultLayout === "briefing" && <LayoutBriefing {...layoutProps} />}
      {resultLayout === "ledger" && <LayoutLedger {...layoutProps} />}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/results-step.tsx
git commit -m "feat: wire design switcher into ResultsStep with all 3 layouts"
```

### Task 9: Visual verification and polish

**Files:**

- May modify: `components/results/layout-briefing.tsx`, `components/results/layout-ledger.tsx`

- [ ] **Step 1: Run dev server**

Run: `pnpm dev`
Open: `http://localhost:3000`

- [ ] **Step 2: Test Design A (current)**

Navigate through the app flow (upload a PDF or use debug mode). Verify the sidebar layout renders identically to before. Check:

- Two-column layout works
- Risk panel filters work
- CA Data tab works
- Design switcher shows "Layout A" selected

- [ ] **Step 3: Test Design B (Briefing Sheet)**

Click "Layout B" in the switcher. Verify:

- Single-column layout renders
- Masthead with group name, CA ref, meta info
- Score strip with score + band + stat counts
- AI Briefing text renders
- Flag strip shows problem categories
- Filter chips work (toggle filters, count updates)
- 9 category rows render with correct numbers
- Click a category row → expands to show AI summary + rule items
- Findings sections (concerns, strengths, conditions, missing) expand/collapse
- CA Data tab works
- Responsive: resize browser to mobile width, verify layout stacks

- [ ] **Step 4: Test Design C (Structured Ledger)**

Click "Layout C" in the switcher. Verify:

- Compact top bar renders
- Two-column summary header (AI briefing + stats)
- Ledger table with 5 columns on desktop
- Problem rows have colored backgrounds
- Click a row → expands to show AI summary + rule items
- Findings sections render at bottom
- Responsive: on mobile, extra columns hide, rows simplify
- Monospace numbers render correctly

- [ ] **Step 5: Test design switcher persistence**

1. Switch to Layout B
2. Refresh the page
3. Verify Layout B is still selected (localStorage persistence)

- [ ] **Step 6: Test dark mode**

Toggle dark mode (press D). Verify all three layouts look correct in dark mode. Check contrast, readability, and that status colors remain visible.

- [ ] **Step 7: Run lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 8: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 9: Fix any visual issues found**

Address spacing, alignment, responsiveness, or dark mode issues discovered during testing. Commit fixes.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "fix: polish Design B and C layouts based on visual testing"
```

### Task 10: Build verification

- [ ] **Step 1: Run production build**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: address build warnings"
```
