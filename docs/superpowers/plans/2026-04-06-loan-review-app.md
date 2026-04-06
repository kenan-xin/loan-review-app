# Loan Review App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step wizard app for AI-powered loan application review with file uploads, background API processing, and detailed results display.

**Architecture:** Client-side wizard with Zustand state. Server-side API routes proxy files to an external AI endpoint using a background job pattern with in-memory storage. Client polls a status endpoint every 10s until results are ready.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui (base-luma), Zustand, pnpm

---

## File Structure

```
types/
  review.ts                  # ReviewResult, Finding, Job type definitions

lib/
  logger.ts                  # Structured console logger (NEW)
  job-store.ts               # In-memory Map + helpers (NEW)
  parse-response.ts          # Adapter: raw API → ReviewResult (NEW)
  utils.ts                   # Existing cn() utility

store/
  loan-review.ts             # Zustand store (NEW)

app/api/loan-review/
  route.ts                   # POST - start background job (NEW)
  status/route.ts            # GET - poll job status (NEW)

components/
  step-indicator.tsx         # Horizontal 4-step stepper (NEW)
  file-upload.tsx            # Drag-and-drop + click upload zone (NEW)
  upload-step.tsx            # Step 1 content (NEW)
  examples-step.tsx          # Step 2 content (NEW)
  processing-step.tsx        # Step 3 content (NEW)
  results-step.tsx           # Step 4 content (NEW)
  wizard-footer.tsx          # Back/Next buttons (NEW)
  ui/button.tsx              # Existing
  theme-provider.tsx         # Existing

app/
  page.tsx                   # Main wizard page (MODIFY)
  layout.tsx                 # Existing, no changes
  globals.css                # Existing, no changes
```

---

### Task 1: Types and Logger

**Files:**

- Create: `types/review.ts`
- Create: `lib/logger.ts`

- [ ] **Step 1: Create types/review.ts**

```ts
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
```

- [ ] **Step 2: Create lib/logger.ts**

```ts
type LogLevel = "INFO" | "WARN" | "ERROR"

function formatMessage(
  level: LogLevel,
  context: string,
  message: string,
  meta?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString()
  const metaStr = meta
    ? " | " +
      Object.entries(meta)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : ""
  return `[${timestamp}] ${level.padEnd(5)} [${context}] ${message}${metaStr}`
}

export const logger = {
  info: (context: string, message: string, meta?: Record<string, unknown>) => {
    console.log(formatMessage("INFO", context, message, meta))
  },
  warn: (context: string, message: string, meta?: Record<string, unknown>) => {
    console.warn(formatMessage("WARN", context, message, meta))
  },
  error: (context: string, message: string, meta?: Record<string, unknown>) => {
    console.error(formatMessage("ERROR", context, message, meta))
  },
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no imports yet, just definitions)

- [ ] **Step 4: Commit**

```bash
git add types/review.ts lib/logger.ts
git commit -m "feat: add types and structured logger"
```

---

### Task 2: Job Store

**Files:**

- Create: `lib/job-store.ts`
- Uses: `types/review.ts`, `lib/logger.ts`

- [ ] **Step 1: Create lib/job-store.ts**

```ts
import type { Job } from "@/types/review"
import { logger } from "@/lib/logger"

const jobs = new Map<string, Job>()

export function createJob(jobId: string): void {
  jobs.set(jobId, {
    status: "processing",
    startedAt: Date.now(),
  })
  logger.info("job-store", "Job created", { jobId, totalJobs: jobs.size })
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId)
}

export function completeJob(jobId: string, result: unknown): void {
  const job = jobs.get(jobId)
  if (!job) {
    logger.warn("job-store", "Attempted to complete unknown job", { jobId })
    return
  }
  job.status = "complete"
  job.result = result
  const durationMs = Date.now() - job.startedAt
  logger.info("job-store", "Job completed", { jobId, durationMs })
}

export function failJob(jobId: string, error: string): void {
  const job = jobs.get(jobId)
  if (!job) {
    logger.warn("job-store", "Attempted to fail unknown job", { jobId })
    return
  }
  job.status = "error"
  job.error = error
  const durationMs = Date.now() - job.startedAt
  logger.error("job-store", "Job failed", { jobId, error, durationMs })
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId)
  logger.info("job-store", "Job deleted", { jobId })
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/job-store.ts
git commit -m "feat: add in-memory job store"
```

---

### Task 3: Response Adapter

**Files:**

- Create: `lib/parse-response.ts`
- Uses: `types/review.ts`

- [ ] **Step 1: Create lib/parse-response.ts**

Placeholder adapter that returns mock data. When the real API contract is known, only this file changes.

```ts
import type { ReviewResult } from "@/types/review"

export function parseResponse(raw: unknown): ReviewResult {
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
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/parse-response.ts
git commit -m "feat: add response adapter with placeholder data"
```

---

### Task 4: API Routes

**Files:**

- Create: `app/api/loan-review/route.ts`
- Create: `app/api/loan-review/status/route.ts`
- Uses: `lib/job-store.ts`, `lib/logger.ts`

- [ ] **Step 1: Create app/api/loan-review/route.ts**

This route receives files as FormData, starts the external POST in the background, and returns a jobId immediately. The `maxDuration` export tells Next.js to allow up to 30 minutes.

```ts
import { NextResponse } from "next/server"
import { createJob, getJob, completeJob, failJob } from "@/lib/job-store"
import { logger } from "@/lib/logger"

export const maxDuration = 1800

const EXTERNAL_API_URL = "https://dev-genie.001.gs/smart-api/loan-review"
const EXTERNAL_API_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export async function POST(request: Request): Promise<NextResponse> {
  const context = "POST /api/loan-review"

  try {
    const formData = await request.formData()
    const application = formData.get("application") as File | null
    const examples = formData.getAll("examples") as File[]

    if (!application) {
      logger.warn(context, "Missing application file")
      return NextResponse.json(
        { error: "Application file is required" },
        { status: 400 }
      )
    }

    const jobId = crypto.randomUUID()
    createJob(jobId)

    logger.info(context, "New job started", {
      jobId,
      applicationFile: application.name,
      exampleFiles: examples.length,
    })

    // Forward to external API in the background
    forwardToExternalApi(jobId, formData).catch((err) => {
      logger.error(context, "Unexpected error in background task", {
        jobId,
        error: String(err),
      })
    })

    return NextResponse.json({ jobId })
  } catch (err) {
    logger.error(context, "Failed to process request", { error: String(err) })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function forwardToExternalApi(
  jobId: string,
  formData: FormData
): Promise<void> {
  const context = "POST /api/loan-review"
  logger.info(context, "Forwarding to external API", {
    jobId,
    url: EXTERNAL_API_URL,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    EXTERNAL_API_TIMEOUT_MS
  )

  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const durationMs = Date.now() - (getJob(jobId)?.startedAt ?? Date.now())
    const durationMin = (durationMs / 60000).toFixed(1)

    if (!response.ok) {
      const body = await response.text().catch(() => "unable to read body")
      logger.error(context, "External API error", {
        jobId,
        status: response.status,
        duration: `${durationMin}m`,
        body,
      })
      failJob(jobId, `External API returned status ${response.status}`)
      return
    }

    const result = await response.json()
    logger.info(context, "External API responded", {
      jobId,
      status: response.status,
      duration: `${durationMin}m`,
    })
    completeJob(jobId, result)
  } catch (err) {
    clearTimeout(timeoutId)

    if (controller.signal.aborted) {
      logger.error(context, "External API timeout", { jobId })
      failJob(jobId, "Request timed out after 30 minutes")
    } else {
      logger.error(context, "External API fetch failed", {
        jobId,
        error: String(err),
      })
      failJob(jobId, `Failed to reach external API: ${String(err)}`)
    }
  }
}
```

- [ ] **Step 2: Create app/api/loan-review/status/route.ts**

```ts
import { NextResponse } from "next/server"
import { getJob } from "@/lib/job-store"
import { logger } from "@/lib/logger"

export async function GET(request: Request): Promise<NextResponse> {
  const context = "GET /api/loan-review/status"
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const job = getJob(jobId)

  if (!job) {
    logger.warn(context, "Job not found", { jobId })
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const elapsedSeconds = Math.floor((Date.now() - job.startedAt) / 1000)

  logger.info(context, "Status poll", {
    jobId,
    status: job.status,
    elapsedSeconds,
  })

  return NextResponse.json({
    status: job.status,
    result: job.result ?? null,
    error: job.error ?? null,
    elapsedSeconds,
  })
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/loan-review/route.ts app/api/loan-review/status/route.ts
git commit -m "feat: add API routes for loan review job submission and polling"
```

---

### Task 5: Zustand Store

**Files:**

- Create: `store/loan-review.ts`
- Uses: `types/review.ts`

- [ ] **Step 1: Create store/loan-review.ts**

```ts
import { create } from "zustand"
import type { ReviewResult } from "@/types/review"
import { parseResponse } from "@/lib/parse-response"

const SESSION_KEY = "loan-review-job-id"
const POLL_INTERVAL_MS = 10_000
const MAX_POLL_MS = 30 * 60 * 1000

interface LoanReviewState {
  step: 1 | 2 | 3 | 4
  applicationFile: File | null
  exampleFiles: File[]
  jobId: string | null
  result: ReviewResult | null
  error: string | null
  isSubmitting: boolean

  setStep: (step: 1 | 2 | 3 | 4) => void
  setApplicationFile: (file: File | null) => void
  setExampleFiles: (files: File[]) => void
  submit: () => Promise<void>
  reset: () => void
  resumeJob: (jobId: string) => void
}

export const useLoanReviewStore = create<LoanReviewState>((set, get) => ({
  step: 1,
  applicationFile: null,
  exampleFiles: [],
  jobId: null,
  result: null,
  error: null,
  isSubmitting: false,

  setStep: (step) => set({ step }),

  setApplicationFile: (file) => set({ applicationFile: file }),

  setExampleFiles: (files) => set({ exampleFiles: files }),

  submit: async () => {
    const { applicationFile, exampleFiles, jobId, isSubmitting } = get()

    if (jobId || isSubmitting) return
    if (!applicationFile) return

    set({ isSubmitting: true, error: null })

    try {
      const formData = new FormData()
      formData.append("application", applicationFile)
      for (const file of exampleFiles) {
        formData.append("examples", file)
      }

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
      sessionStorage.setItem(SESSION_KEY, newJobId)

      set({ jobId: newJobId, step: 3, isSubmitting: false })

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
    const { jobId } = get()
    if (jobId) {
      sessionStorage.removeItem(SESSION_KEY)
    }
    set({
      step: 1,
      applicationFile: null,
      exampleFiles: [],
      jobId: null,
      result: null,
      error: null,
      isSubmitting: false,
    })
  },

  resumeJob: (jobId) => {
    set({ jobId, step: 3, isSubmitting: false })
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
        step: 3,
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
        sessionStorage.removeItem(SESSION_KEY)
        set({ result: parseResponse(data.result), step: 4 })
      } else if (data.status === "error") {
        clearInterval(interval)
        sessionStorage.removeItem(SESSION_KEY)
        set({
          error: data.error ?? "Review failed. Please try again.",
          step: 3,
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

// Helper to resume from sessionStorage on page load
export function tryResumeJob(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(SESSION_KEY)
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add store/loan-review.ts
git commit -m "feat: add Zustand store with submit, polling, and resume logic"
```

---

### Task 6: Shared UI Components

**Files:**

- Create: `components/step-indicator.tsx`
- Create: `components/file-upload.tsx`
- Create: `components/wizard-footer.tsx`

- [ ] **Step 1: Create components/step-indicator.tsx**

```tsx
"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const steps = [
  { number: 1, label: "Upload" },
  { number: 2, label: "Examples" },
  { number: 3, label: "Review" },
  { number: 4, label: "Results" },
] as const

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number
          const isLast = index === steps.length - 1

          return (
            <li key={step.number} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/30 text-muted-foreground/60"
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : step.number}
                </div>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:inline",
                    isCurrent && "text-foreground",
                    isCompleted && "text-muted-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground/60"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-px w-6 sm:w-10",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
```

- [ ] **Step 2: Create components/file-upload.tsx**

```tsx
"use client"

import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPE = "application/pdf"

interface FileUploadProps {
  multiple?: boolean
  files: File[]
  onFilesChange: (files: File[]) => void
  label: string
  description: string
}

export function FileUpload({
  multiple = false,
  files,
  onFilesChange,
  label,
  description,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (
      file.type !== ACCEPTED_TYPE &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return `"${file.name}" is not a PDF. Only PDF files are accepted.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" exceeds the 10MB size limit.`
    }
    return null
  }

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(incoming)

      for (const file of fileArray) {
        const err = validateFile(file)
        if (err) {
          setError(err)
          return
        }
      }

      if (multiple) {
        // Dedupe by name — new files replace existing with same name
        const existing = new Map(files.map((f) => [f.name, f]))
        for (const f of fileArray) {
          existing.set(f.name, f)
        }
        onFilesChange(Array.from(existing.values()))
      } else {
        onFilesChange(fileArray.slice(0, 1))
      }
    },
    [files, onFilesChange, multiple]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  const removeFile = (name: string) => {
    onFilesChange(files.filter((f) => f.name !== name))
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick()
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
          dragActive && "border-primary bg-primary/5",
          !dragActive &&
            files.length === 0 &&
            "border-muted-foreground/25 hover:border-muted-foreground/50",
          !dragActive && files.length > 0 && "border-primary/30 bg-primary/5"
        )}
      >
        <Upload className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-label={label}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  removeFile(file.name)
                }}
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create components/wizard-footer.tsx**

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface WizardFooterProps {
  onBack?: () => void
  onNext?: () => void
  backLabel?: string
  nextLabel?: string
  backDisabled?: boolean
  nextDisabled?: boolean
  nextLoading?: boolean
}

export function WizardFooter({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Next",
  backDisabled = false,
  nextDisabled = false,
  nextLoading = false,
}: WizardFooterProps) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button
          variant="outline"
          onClick={onBack}
          disabled={backDisabled}
          data-icon="inline-start"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>
      ) : (
        <div />
      )}
      {onNext && (
        <Button
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          data-icon="inline-end"
        >
          {nextLoading ? "Submitting..." : nextLabel}
          {!nextLoading && <ArrowRight className="size-4" />}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/step-indicator.tsx components/file-upload.tsx components/wizard-footer.tsx
git commit -m "feat: add shared UI components (step indicator, file upload, wizard footer)"
```

---

### Task 7: Upload Step (Step 1)

**Files:**

- Create: `components/upload-step.tsx`

- [ ] **Step 1: Create components/upload-step.tsx**

```tsx
"use client"

import { FileUpload } from "@/components/file-upload"

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
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/upload-step.tsx
git commit -m "feat: add upload step component"
```

---

### Task 8: Examples Step (Step 2)

**Files:**

- Create: `components/examples-step.tsx`

- [ ] **Step 1: Create components/examples-step.tsx**

```tsx
"use client"

import { FileUpload } from "@/components/file-upload"

interface ExamplesStepProps {
  files: File[]
  onFilesChange: (files: File[]) => void
}

export function ExamplesStep({ files, onFilesChange }: ExamplesStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Bad Examples</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload past examples of problematic loan applications. The AI will
          learn to identify similar patterns in the new application.
        </p>
      </div>
      <FileUpload
        multiple
        files={files}
        onFilesChange={onFilesChange}
        label="Drop PDFs here or click to browse"
        description="One or more PDFs, up to 10MB each"
      />
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/examples-step.tsx
git commit -m "feat: add examples step component"
```

---

### Task 9: Processing Step (Step 3)

**Files:**

- Create: `components/processing-step.tsx`

- [ ] **Step 1: Create components/processing-step.tsx**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProcessingStepProps {
  isSubmitting: boolean
  error: string | null
  onRetry: () => void
}

export function ProcessingStep({
  isSubmitting,
  error,
  onRetry,
}: ProcessingStepProps) {
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

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium">Submitting for review...</p>
      </div>
    )
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

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <h3 className="mt-4 text-lg font-semibold">
        AI is reviewing the application
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This may take between 5 and 30 minutes. You can leave this page and come
        back — your review will continue in the background.
      </p>
      <p className="mt-4 font-mono text-sm text-muted-foreground">
        Elapsed: {formatTime(elapsed)}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/processing-step.tsx
git commit -m "feat: add processing step with timer and error states"
```

---

### Task 10: Results Step (Step 4)

**Files:**

- Create: `components/results-step.tsx`
- Uses: `types/review.ts`

- [ ] **Step 1: Create components/results-step.tsx**

```tsx
"use client"

import type { ReviewResult, Finding } from "@/types/review"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react"

interface ResultsStepProps {
  result: ReviewResult
  onStartNew: () => void
}

const severityOrder: Record<Finding["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

const severityConfig = {
  critical: {
    icon: XCircle,
    label: "Critical",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    badgeClassName:
      "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    badgeClassName:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
  },
  info: {
    icon: Info,
    label: "Info",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
    badgeClassName:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
  },
}

const statusConfig = {
  approved: {
    icon: CheckCircle,
    label: "Approved",
    className:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900",
    scoreColor: "text-green-600 dark:text-green-400",
    barColor: "bg-green-500",
  },
  flagged: {
    icon: AlertTriangle,
    label: "Flagged",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    scoreColor: "text-amber-600 dark:text-amber-400",
    barColor: "bg-amber-500",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    scoreColor: "text-red-600 dark:text-red-400",
    barColor: "bg-red-500",
  },
}

export function ResultsStep({ result, onStartNew }: ResultsStepProps) {
  const sortedFindings = [...result.findings].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )

  const status = statusConfig[result.status]
  const StatusIcon = status.icon

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-4 py-3",
          status.className
        )}
      >
        <StatusIcon className="size-5" />
        <span className="text-sm font-semibold">{status.label}</span>
      </div>

      {/* Risk Score + Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="shrink-0">
          <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Risk Score
          </p>
          <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-4">
            <span className={cn("text-3xl font-bold", status.scoreColor)}>
              {result.riskScore}
            </span>
            <span className="text-xs text-muted-foreground">out of 100</span>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status.barColor
                )}
                style={{ width: `${result.riskScore}%` }}
              />
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Summary
          </p>
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </div>
      </div>

      {/* Findings */}
      {sortedFindings.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Findings
          </p>
          <ul className="space-y-3">
            {sortedFindings.map((finding, i) => {
              const config = severityConfig[finding.severity]
              const Icon = config.icon
              return (
                <li
                  key={i}
                  className={cn("rounded-lg border p-4", config.className)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {finding.category}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            config.badgeClassName
                          )}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        {finding.title}
                      </p>
                      <p className="mt-1 text-sm opacity-80">
                        {finding.description}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Recommendations
          </p>
          <ol className="list-inside list-decimal space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Start New */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={onStartNew}>
          Start New Review
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/results-step.tsx
git commit -m "feat: add results step with risk score, findings, and recommendations"
```

---

### Task 11: Main Page Assembly

**Files:**

- Modify: `app/page.tsx`
- Uses: All components from previous tasks, Zustand store

- [ ] **Step 1: Rewrite app/page.tsx**

Replace the existing placeholder content with the wizard page. This wires all steps together, handles step transitions, and implements the resume-from-sessionStorage logic.

```tsx
"use client"

import { useEffect } from "react"
import { useLoanReviewStore, tryResumeJob } from "@/store/loan-review"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ExamplesStep } from "@/components/examples-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"

export default function Page() {
  const {
    step,
    applicationFile,
    exampleFiles,
    jobId,
    result,
    error,
    isSubmitting,
    setStep,
    setApplicationFile,
    setExampleFiles,
    submit,
    reset,
    resumeJob,
  } = useLoanReviewStore()

  // Resume from sessionStorage on mount
  useEffect(() => {
    const savedJobId = tryResumeJob()
    if (savedJobId) {
      resumeJob(savedJobId)
    }
  }, [resumeJob])

  const handleBack = () => {
    if (step === 2) setStep(1)
  }

  const handleNext = () => {
    if (step === 1 && applicationFile) setStep(2)
    if (step === 2 && exampleFiles.length > 0) {
      submit()
    }
  }

  const handleRetry = () => {
    // Reset job state but keep files
    useLoanReviewStore.setState({
      jobId: null,
      error: null,
      result: null,
      step: 2,
    })
    sessionStorage.removeItem("loan-review-job-id")
  }

  const canGoNext =
    (step === 1 && !!applicationFile) || (step === 2 && exampleFiles.length > 0)

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
            <ExamplesStep
              files={exampleFiles}
              onFilesChange={setExampleFiles}
            />
          )}
          {step === 3 && (
            <ProcessingStep
              isSubmitting={isSubmitting}
              error={error}
              onRetry={handleRetry}
            />
          )}
          {step === 4 && result && (
            <ResultsStep result={result} onStartNew={reset} />
          )}
        </div>

        {step !== 4 && (
          <div className="mt-8 border-t pt-4">
            <WizardFooter
              onBack={step === 2 ? handleBack : undefined}
              onNext={step <= 2 ? handleNext : undefined}
              nextLabel={step === 2 ? "Submit for Review" : "Next"}
              nextDisabled={!canGoNext}
              backDisabled={step === 3 && !!jobId}
              nextLoading={isSubmitting}
            />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Run dev server and visually verify**

Run: `pnpm dev`
Open http://localhost:3000. Verify:

- Step indicator shows 4 steps with Step 1 active
- Upload step shows drag-and-drop zone
- Back/Next buttons appear with correct disabled states

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire up main wizard page with all steps"
```

---

### Task 12: Final Verification and Polish

**Files:**

- No new files. Verify everything works end-to-end.

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Run format**

Run: `pnpm format`
Check for any changed files.

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: PASS with no errors

- [ ] **Step 5: Manual smoke test in browser**

Run: `pnpm dev`
Open http://localhost:3000 and verify the complete flow:

1. **Step 1**: Upload a PDF. Verify Next button enables. Click Next.
2. **Step 2**: Upload one or more PDFs. Verify Next button says "Submit for Review". Click it.
3. **Step 3**: Verify spinner shows, timer counts up. (External API won't respond since it's not built yet — the job will eventually timeout after 30 minutes, or you can restart the server to test the error state.)
4. **Error state**: Restart the dev server to clear the in-memory store, then refresh the page. Verify the "Job not found" error is handled gracefully.
5. **Responsive**: Resize browser to mobile width. Verify step indicator hides labels, buttons stack, content is full-width.

- [ ] **Step 6: Commit any formatting changes**

If `pnpm format` changed files:

```bash
git add -A
git commit -m "style: format code with prettier"
```
