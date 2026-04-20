# Split Admin Upload and Loan Review Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the combined upload wizard into two pages — `/admin` for uploading bad loan examples to the risk learning API, and `/` for submitting a single application for AI review (3-step wizard).

**Architecture:** Two independent pages. Admin page manages its own local state (no Zustand). Main page reuses the existing Zustand store with the examples step removed. A new API proxy route forwards admin uploads to `risk_learning`.

**Tech Stack:** Next.js 16, React 19, Zustand, shadcn/ui, Tailwind CSS, nuqs

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/admin/page.tsx` | Admin upload page with local state |
| Create | `app/api/risk-learning/route.ts` | Proxy POST to `risk_learning` API |
| Modify | `components/file-upload.tsx:8` | Add `maxFileSize` prop (default 10MB) |
| Modify | `store/loan-review.ts` | Remove `exampleFiles`, renumber steps 1-3 |
| Modify | `components/step-indicator.tsx:7-11` | Change from 4 steps to 3 |
| Modify | `app/page.tsx` | Remove ExamplesStep, update step logic |
| Modify | `app/api/loan-review/route.ts:15-16` | Remove `examples` handling |
| Delete | `components/examples-step.tsx` | No longer needed |

---

### Task 1: Add `maxFileSize` prop to FileUpload

**Files:**
- Modify: `components/file-upload.tsx`

- [ ] **Step 1: Add `maxFileSize` prop with default value**

Replace line 8 (`const MAX_FILE_SIZE = 10 * 1024 * 1024`) and update the component interface and destructuring:

```tsx
// Line 8: remove the constant
// Lines 11-17: update interface
interface FileUploadProps {
  multiple?: boolean
  files: File[]
  onFilesChange: (files: File[]) => void
  label: string
  description: string
  maxFileSize?: number
}
```

Update destructuring on line 19:

```tsx
export function FileUpload({
  multiple = false,
  files,
  onFilesChange,
  label,
  description,
  maxFileSize = 10 * 1024 * 1024,
}: FileUploadProps) {
```

Update `validateFile` on line 30 to use `maxFileSize` instead of the removed constant:

```tsx
  const validateFile = (file: File): string | null => {
    if (
      file.type !== ACCEPTED_TYPE &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return `"${file.name}" is not a PDF. Only PDF files are accepted.`
    }
    if (file.size > maxFileSize) {
      const limitMB = Math.round(maxFileSize / 1024 / 1024)
      return `"${file.name}" exceeds the ${limitMB}MB size limit.`
    }
    return null
  }
```

- [ ] **Step 2: Verify main page still works**

Run: `pnpm typecheck`
Expected: PASS (prop is optional with default)

- [ ] **Step 3: Commit**

```bash
git add components/file-upload.tsx
git commit -m "feat: add maxFileSize prop to FileUpload component"
```

---

### Task 2: Create risk-learning API proxy route

**Files:**
- Create: `app/api/risk-learning/route.ts`

- [ ] **Step 1: Create the route handler**

```bash
mkdir -p app/api/risk-learning
```

Create `app/api/risk-learning/route.ts`:

```ts
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const RISK_LEARNING_URL = "https://dev-genie.001.gs/smart-api/risk_learning_agent_s2"

export async function POST(request: Request): Promise<NextResponse> {
  const context = "POST /api/risk-learning"

  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      logger.warn(context, "No files provided")
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      )
    }

    logger.info(context, "Forwarding files to risk learning API", {
      fileCount: files.length,
    })

    const response = await fetch(RISK_LEARNING_URL, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "unable to read body")
      logger.error(context, "Risk learning API error", {
        status: response.status,
        body,
      })
      return NextResponse.json(
        { error: "Failed to upload examples" },
        { status: 502 }
      )
    }

    const result = await response.json()
    logger.info(context, "Risk learning API responded", {
      status: response.status,
    })

    return NextResponse.json(result)
  } catch (err) {
    logger.error(context, "Request failed", { error: String(err) })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/risk-learning/route.ts
git commit -m "feat: add risk-learning API proxy route"
```

---

### Task 3: Create admin page

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create the admin page with local state**

```bash
mkdir -p app/admin
```

Create `app/admin/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const handleSubmit = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append("files", file)
      }

      const res = await fetch("/api/risk-learning", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload failed" }))
        setMessage({ type: "error", text: data.error ?? "Upload failed" })
        return
      }

      setMessage({ type: "success", text: `${files.length} example(s) uploaded successfully.` })
      setFiles([])
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review Admin</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Bad Loan Examples</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload past examples of problematic loan applications. The AI will
              learn to identify similar patterns in the new application.
            </p>
          </div>

          <FileUpload
            multiple
            files={files}
            onFilesChange={setFiles}
            label="Drop PDFs here or click to browse"
            description="One or more PDFs, up to 50MB each"
            maxFileSize={50 * 1024 * 1024}
          />

          {message && (
            <p
              className={
                message.type === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-green-600 dark:text-green-400"
              }
              role="alert"
            >
              {message.text}
            </p>
          )}
        </div>

        <div className="mt-8 border-t pt-4">
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Examples"}
          </Button>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: add admin page for uploading bad loan examples"
```

---

### Task 4: Update Zustand store — remove examples, renumber steps

**Files:**
- Modify: `store/loan-review.ts`

- [ ] **Step 1: Rewrite store with 3-step flow, no exampleFiles**

Replace the entire file:

```ts
import { create } from "zustand"
import type { ReviewResult } from "@/types/review"
import { parseResponse } from "@/lib/parse-response"

const POLL_INTERVAL_MS = 10_000
const MAX_POLL_MS = 30 * 60 * 1000

interface LoanReviewState {
  step: 1 | 2 | 3
  applicationFile: File | null
  jobId: string | null
  result: ReviewResult | null
  error: string | null
  isSubmitting: boolean

  setStep: (step: 1 | 2 | 3) => void
  setApplicationFile: (file: File | null) => void
  submit: () => Promise<void>
  reset: () => void
  resumeJob: (jobId: string) => void
}

export const useLoanReviewStore = create<LoanReviewState>((set, get) => ({
  step: 1,
  applicationFile: null,
  jobId: null,
  result: null,
  error: null,
  isSubmitting: false,

  setStep: (step) => set({ step }),

  setApplicationFile: (file) => set({ applicationFile: file }),

  submit: async () => {
    const { applicationFile, jobId, isSubmitting } = get()

    if (jobId || isSubmitting) return
    if (!applicationFile) return

    set({ isSubmitting: true, error: null })

    try {
      const formData = new FormData()
      formData.append("application", applicationFile)

      const res = await fetch("/api/loan-review", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }))
        set({ isSubmitting: false, error: data.error ?? "Submission failed" })
        return
      }

      const { jobId: newJobId } = await res.json()

      set({ jobId: newJobId, step: 2, isSubmitting: false })

      // Start polling
      pollUntilComplete(newJobId, set, get)
    } catch (err) {
      set({
        isSubmitting: false,
        error: `Submission failed: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  },

  reset: () => {
    set({
      step: 1,
      applicationFile: null,
      jobId: null,
      result: null,
      error: null,
      isSubmitting: false,
    })
  },

  resumeJob: (jobId) => {
    set({ jobId, step: 2, isSubmitting: false })
    pollUntilComplete(jobId, set, get)
  },
}))

function pollUntilComplete(
  jobId: string,
  set: (partial: Partial<LoanReviewState>) => void,
  get: () => LoanReviewState
) {
  const startTime = Date.now()
  let consecutiveFailures = 0

  const interval = setInterval(async () => {
    const state = get()

    // Stop if job was reset
    if (state.jobId !== jobId) {
      clearInterval(interval)
      return
    }

    // Timeout check
    if (Date.now() - startTime > MAX_POLL_MS) {
      clearInterval(interval)
      set({
        error: "Review timed out after 30 minutes. Please try again.",
        step: 2,
      })
      return
    }

    try {
      const res = await fetch(`/api/loan-review/status?jobId=${jobId}`)

      if (!res.ok) {
        consecutiveFailures++
        if (consecutiveFailures >= 3) {
          clearInterval(interval)
          set({ error: "Lost connection to server. Please try again." })
        }
        return
      }

      consecutiveFailures = 0
      const data = await res.json()

      if (data.status === "complete") {
        clearInterval(interval)
        set({ result: parseResponse(data.result), step: 3 })
      } else if (data.status === "error") {
        clearInterval(interval)
        set({
          error: data.error ?? "Review failed. Please try again.",
          step: 2,
        })
      }
    } catch {
      consecutiveFailures++
      if (consecutiveFailures >= 3) {
        clearInterval(interval)
        set({
          error: "Network error. Please check your connection and try again.",
        })
      }
    }
  }, POLL_INTERVAL_MS)
}
```

Key changes from original:
- Removed `exampleFiles` state and `setExampleFiles` action
- Step type: `1 | 2 | 3` instead of `1 | 2 | 3 | 4`
- `submit()`: no longer appends `examples` to FormData
- After submit: sets `step: 2` (processing) instead of `step: 3`
- On complete: sets `step: 3` (results) instead of `step: 4`
- On error: sets `step: 2` instead of `step: 3`
- `reset()`: no longer resets `exampleFiles`

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: May fail on `page.tsx` (still references old store shape) — that's OK, fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add store/loan-review.ts
git commit -m "refactor: remove exampleFiles from store, renumber steps 1-3"
```

---

### Task 5: Update step indicator to 3 steps

**Files:**
- Modify: `components/step-indicator.tsx`

- [ ] **Step 1: Change steps array and type**

Replace lines 6-15:

```tsx
const steps = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Review" },
  { number: 3, label: "Results" },
] as const

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3
}
```

Rest of the component stays the same.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: May still fail on `page.tsx` — OK, fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add components/step-indicator.tsx
git commit -m "refactor: update step indicator from 4 to 3 steps"
```

---

### Task 6: Update main page — remove examples step

**Files:**
- Modify: `app/page.tsx`
- Delete: `components/examples-step.tsx`
- Modify: `app/api/loan-review/route.ts`

- [ ] **Step 1: Rewrite main page**

Replace entire `app/page.tsx`:

```tsx
"use client"

import { Suspense, useEffect } from "react"
import { useQueryState } from "nuqs"
import { useLoanReviewStore } from "@/store/loan-review"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"

export default function Page() {
  return (
    <Suspense>
      <LoanReviewWizard />
    </Suspense>
  )
}

function LoanReviewWizard() {
  const [urlJobId, setUrlJobId] = useQueryState("jobId")

  const {
    step,
    applicationFile,
    jobId,
    result,
    error,
    isSubmitting,
    setApplicationFile,
    submit,
    reset,
    resumeJob,
  } = useLoanReviewStore()

  // Sync URL → store on mount (resume from query string)
  useEffect(() => {
    if (urlJobId && !jobId) {
      resumeJob(urlJobId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store → URL when jobId changes
  useEffect(() => {
    if (jobId && jobId !== urlJobId) {
      setUrlJobId(jobId)
    }
    if (!jobId && urlJobId) {
      setUrlJobId(null)
    }
  }, [jobId, urlJobId, setUrlJobId])

  const handleNext = () => {
    if (step === 1 && applicationFile) {
      submit()
    }
  }

  const handleRetry = () => {
    useLoanReviewStore.setState({
      jobId: null,
      error: null,
      result: null,
      step: 1,
    })
    setUrlJobId(null)
  }

  const canGoNext = step === 1 && !!applicationFile

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-8">
          <StepIndicator currentStep={step} />
        </div>

        <div className="flex-1">
          {step === 1 && (
            <UploadStep
              file={applicationFile}
              onFileChange={setApplicationFile}
            />
          )}
          {step === 2 && (
            <ProcessingStep
              isSubmitting={isSubmitting}
              error={error}
              onRetry={handleRetry}
            />
          )}
          {step === 3 && result && (
            <ResultsStep result={result} onStartNew={reset} />
          )}
        </div>

        {step === 1 && (
          <div className="mt-8 border-t pt-4">
            <WizardFooter
              onNext={handleNext}
              nextLabel="Submit for Review"
              nextDisabled={!canGoNext}
              nextLoading={isSubmitting}
            />
          </div>
        )}
      </main>
    </div>
  )
}
```

Key changes:
- Removed `ExamplesStep` import and render
- Removed `exampleFiles`, `setExampleFiles`, `setStep` from store destructure
- Removed `handleBack` (no back button needed — only one upload step)
- `handleNext`: directly calls `submit()` instead of advancing to step 2
- Step 2 = Processing (was step 3), Step 3 = Results (was step 4)
- Footer only shown on step 1
- `handleRetry`: resets to step 1 instead of step 2

- [ ] **Step 2: Delete examples-step component**

```bash
rm components/examples-step.tsx
```

- [ ] **Step 3: Update API route — remove examples handling**

In `app/api/loan-review/route.ts`, remove lines 15-16 (the `examples` extraction and example count in log):

```ts
    const application = formData.get("application") as File | null

    if (!application) {
```

And update the log on line 29-33 to remove `exampleFiles`:

```ts
    logger.info(context, "New job started", {
      jobId,
      applicationFile: application.name,
    })
```

- [ ] **Step 4: Verify everything compiles**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Verify in browser**

Run: `pnpm dev`

1. Visit `http://localhost:3000` — should show 3-step wizard with Upload as step 1
2. Upload a PDF, click "Submit for Review" — should go to Processing (step 2)
3. Visit `http://localhost:3000/admin` — should show admin upload page with 50MB limit

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/api/loan-review/route.ts
git rm components/examples-step.tsx
git commit -m "feat: remove examples step from review wizard, simplify to 3 steps"
```

---

## Self-Review

**Spec coverage:**
- `/admin` page with multi-file upload, 50MB limit → Task 3
- POST to `/api/risk-learning` → Task 2
- Proxy to `risk_learning` API → Task 2
- Success/error message → Task 3
- No auth → Not implemented (correct — spec says no auth needed)
- Main page 3 steps → Tasks 4, 5, 6
- Only send application file → Tasks 4, 6
- Remove `exampleFiles` from store → Task 4
- Delete `examples-step.tsx` → Task 6

**Placeholder scan:** No TBDs, TODOs, or vague instructions. All code provided inline.

**Type consistency:** Step type `1 | 2 | 3` used consistently in store, step-indicator, and page. `maxFileSize` prop name matches across FileUpload and admin page.
