# Review History Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Review History" table to the Upload step that fetches past reviews from the retriever API and lets users view any past result.

**Architecture:** Extend the Zustand store with `reviewHistory` state and two actions (`fetchReviewHistory`, `viewHistoryItem`). New `ReviewHistory` component renders below the dropzone. Clicking View parses the item's JSON string fields and feeds them through the existing `transformToReviewResult` pipeline to populate step 3.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, shadcn/ui (Button, Separator, Spinner), native fetch

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `types/review.ts` | Modify | Add `ReviewHistoryItem` interface |
| `store/loan-review.ts` | Modify | Add `reviewHistory` state, `fetchReviewHistory()`, `viewHistoryItem()` actions, update `reset()` |
| `components/review-history.tsx` | Create | Table component with fetch-on-mount, loading/empty/error states, View button |
| `components/upload-step.tsx` | Modify | Add Separator + ReviewHistory below FileUpload |

---

### Task 1: Add ReviewHistoryItem type

**Files:**
- Modify: `types/review.ts`

- [ ] **Step 1: Add the interface**

Append to the end of `types/review.ts`:

```ts
export interface ReviewHistoryItem {
  id: number
  filename: string
  created_at: string
  updated_at: string
  ca: string
  result: string
  summary: string
  decision: string
}
```

- [ ] **Step 2: Commit**

```bash
git add types/review.ts
git commit -m "feat: add ReviewHistoryItem type"
```

---

### Task 2: Extend Zustand store

**Files:**
- Modify: `store/loan-review.ts`

- [ ] **Step 1: Add imports and state**

At the top of `store/loan-review.ts`, add `ReviewHistoryItem` to the imports from `@/types/review`:

```ts
import type { SimulationResult, ReviewHistoryItem } from "@/types/review"
```

Add `reviewHistory` and `isLoadingHistory` to the `LoanReviewState` interface:

```ts
interface LoanReviewState {
  step: 1 | 2 | 3
  applicationFile: File | null
  result: SimulationResult | null
  error: string | null
  isSubmitting: boolean
  stage: SseStage
  resultLayout: ResultLayout
  reviewHistory: ReviewHistoryItem[]
  isLoadingHistory: boolean
  historyError: string | null

  setStep: (step: 1 | 2 | 3) => void
  setApplicationFile: (file: File | null) => void
  submit: () => void
  reset: () => void
  setResultLayout: (layout: ResultLayout) => void
  fetchReviewHistory: () => Promise<void>
  viewHistoryItem: (item: ReviewHistoryItem) => void
}
```

Add defaults in the store creator:

```ts
reviewHistory: [],
isLoadingHistory: false,
historyError: null,
```

- [ ] **Step 2: Add fetchReviewHistory action**

Add this action inside the store creator, after `setResultLayout`:

```ts
fetchReviewHistory: async () => {
  const { reviewHistory } = get()
  if (reviewHistory.length > 0) return

  const PROXY_BASE = process.env.NEXT_PUBLIC_PROXY_URL_V2 ?? ""
  if (!PROXY_BASE) {
    set({ historyError: "Proxy URL not configured" })
    return
  }

  set({ isLoadingHistory: true, historyError: null })
  try {
    const response = await fetch(`${PROXY_BASE}/smart-api/hl_retriever`)
    if (!response.ok) throw new Error(`Server error: ${response.status}`)
    const data = await response.json()
    const items: ReviewHistoryItem[] = JSON.parse(data.result)
    const completed = items.filter(
      (item) => {
        try {
          const parsed = JSON.parse(item.result)
          return Array.isArray(parsed) && parsed.length > 0
        } catch {
          return false
        }
      }
    )
    set({ reviewHistory: completed, isLoadingHistory: false })
  } catch (err) {
    set({
      historyError: String(err.message ?? err),
      isLoadingHistory: false,
    })
  }
},
```

- [ ] **Step 3: Add viewHistoryItem action**

Add this action after `fetchReviewHistory`:

```ts
viewHistoryItem: (item: ReviewHistoryItem) => {
  const ca = JSON.parse(item.ca)
  const result = JSON.parse(item.result)
  const summary = JSON.parse(item.summary)
  const decision = JSON.parse(item.decision)

  const reviewResult = transformToReviewResult(
    ca as SimulationResult["caData"],
    result as SimulationResult["evaluationResults"],
    summary as SimulationResult["evaluationSummary"],
    decision as SimulationResult["evaluationDecision"]
  )

  set({
    result: reviewResult,
    step: 3,
    isSubmitting: false,
    stage: "completed",
  })
},
```

- [ ] **Step 4: Update reset action**

In the existing `reset()` action, add `reviewHistory`, `isLoadingHistory`, and `historyError` to the `set()` call:

```ts
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
    resultLayout: "sidebar",
    reviewHistory: [],
    isLoadingHistory: false,
    historyError: null,
  })
},
```

- [ ] **Step 5: Commit**

```bash
git add store/loan-review.ts
git commit -m "feat: add review history store actions"
```

---

### Task 3: Create ReviewHistory component

**Files:**
- Create: `components/review-history.tsx`

- [ ] **Step 1: Create the component**

Create `components/review-history.tsx`:

```tsx
"use client"

import { useEffect } from "react"
import { useLoanReviewStore } from "@/store/loan-review"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function ReviewHistory() {
  const {
    reviewHistory,
    isLoadingHistory,
    historyError,
    fetchReviewHistory,
    viewHistoryItem,
  } = useLoanReviewStore()

  useEffect(() => {
    fetchReviewHistory()
  }, [fetchReviewHistory])

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <h2 className="text-lg font-semibold">Review History</h2>
      </div>

      {isLoadingHistory && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner />
          Loading review history...
        </div>
      )}

      {historyError && (
        <p className="py-4 text-sm text-muted-foreground">
          Could not load review history.
        </p>
      )}

      {!isLoadingHistory && !historyError && reviewHistory.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">
          No previous reviews.
        </p>
      )}

      {!isLoadingHistory && reviewHistory.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Filename</th>
                <th className="px-4 py-2.5 text-left font-medium">Created At</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviewHistory.map((item, index) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-2.5">{item.filename}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="outline" size="sm" onClick={() => viewHistoryItem(item)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

Note: The `<Separator />` is included inside the component itself so `upload-step.tsx` stays clean.

- [ ] **Step 2: Commit**

```bash
git add components/review-history.tsx
git commit -m "feat: add ReviewHistory component"
```

---

### Task 4: Integrate into Upload step

**Files:**
- Modify: `components/upload-step.tsx`

- [ ] **Step 1: Add ReviewHistory to upload step**

Update `components/upload-step.tsx` to import and render `ReviewHistory`:

```tsx
"use client"

import { FileUpload } from "@/components/file-upload"
import { ReviewHistory } from "@/components/review-history"

interface UploadStepProps {
  file: File | null
  onFileChange: (file: File | null) => void
}

export function UploadStep({ file, onFileChange }: UploadStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Loan Application</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the loan application form you want the AI to review.
        </p>
      </div>
      <FileUpload
        files={file ? [file] : []}
        onFilesChange={(files) => onFileChange(files[0] ?? null)}
        label="Drop your PDF here or click to browse"
        description="PDF only, up to 10MB"
      />
      <ReviewHistory />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/upload-step.tsx
git commit -m "feat: integrate ReviewHistory into upload step"
```

---

### Task 5: Verify

- [ ] **Step 1: Run dev server and check**

Run: `npm run dev`

Verify:
- Step 1 shows the dropzone, then a separator, then "Review History" heading
- Table loads with data from the API (or shows loading/empty/error state)
- Clicking View on a row navigates to step 3 with that item's results
- Going back (reset) returns to step 1 and the table is still there
- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review history issues"
```
