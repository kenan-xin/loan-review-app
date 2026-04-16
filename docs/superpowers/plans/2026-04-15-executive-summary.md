# Executive AI Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible colored executive summary card at the top of the results sidebar so reviewers can quickly grasp the review outcome before diving into details.

**Architecture:** Inline JSX added to the existing `ResultSidebar` component, positioned above the risk gauge. Uses the existing `evaluationDecision.reasoning` field — no new types or data flow changes. The card background color is derived from `evaluationDecision.recommendation`.

**Tech Stack:** React, Tailwind CSS v4, existing shadcn/ui tokens

---

### Task 1: Update mock reasoning field

**Files:**

- Modify: `app/data/evaluation_report_rh_group.json:3280`

- [ ] **Step 1: Replace the reasoning string**

Change line 3280 from the current stats-dump:

```json
"reasoning": "Recommendation: Reject. 16 FAILs (7 High-risk), 45 WARNINGs, 44 PASSes out of 159 rules. Key fails: Breached T&C found; Breached T&C found; Unsecured 68.1% > 50%. Key warnings: Revenue declined 7.2%; Debtor days 121 elevated; PBT RM-3666K (first year loss)."
```

To a human-readable executive summary:

```json
"reasoning": "Annual review for RH Group (GAPP21985), a rubber products manufacturer with a performing account since 2003. The group posted its first-ever PBT loss of RM-3.7M (vs. PBT RM1.1M prior year) alongside a 7.2% revenue decline to RM130M. DSCR has tightened to 1.03x (marginal), and debtor days have stretched to 121 days.\n\nCritical compliance gaps: 6 breached T&Cs detected, unsecured exposure at 68.1% (above 50% threshold), and MOA at 314% (above 90% cap). Shareholding data and financial period end dates are incomplete.\n\nMitigating factors: net cash from operations remains positive at RM8.6M, tangible net worth stands at RM58.9M, and ESG ratings are acceptable."
```

- [ ] **Step 2: Verify JSON is valid**

Run: `python3 -c "import json; json.load(open('app/data/evaluation_report_rh_group.json'))" && echo "valid"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add app/data/evaluation_report_rh_group.json
git commit -m "feat: update mock reasoning to human-readable executive summary"
```

### Task 2: Add executive summary card to sidebar

**Files:**

- Modify: `components/results/result-sidebar.tsx:73-88` (insert above risk gauge)

- [ ] **Step 1: Add the summary card JSX**

In `result-sidebar.tsx`, insert the following block between the group info banner (`</div>` at ~line 84) and the risk gauge section (`{/* Risk gauge */}` at ~line 87):

```tsx
{
  /* Executive AI Summary */
}
{
  evaluationDecision.reasoning && (
    <div
      className={cn(
        "border-b px-4 py-3",
        evaluationDecision.recommendation.toLowerCase().includes("reject")
          ? "bg-red-50 dark:bg-red-950/30"
          : evaluationDecision.recommendation.toLowerCase().includes("approv")
            ? "bg-emerald-50 dark:bg-emerald-950/30"
            : "bg-amber-50 dark:bg-amber-950/30"
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
            evaluationDecision.recommendation.toLowerCase().includes("reject")
              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
              : evaluationDecision.recommendation
                    .toLowerCase()
                    .includes("approv")
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
          )}
        >
          {evaluationDecision.recommendation}
        </span>
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          AI Summary
        </span>
      </div>
      <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/80">
        {evaluationDecision.reasoning}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/results/result-sidebar.tsx
git commit -m "feat: add executive AI summary card to results sidebar"
```
