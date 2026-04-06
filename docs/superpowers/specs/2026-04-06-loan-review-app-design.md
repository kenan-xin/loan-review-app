# Loan Review App — Design Spec

## Overview

A demo Next.js app for a Malaysian bank client showcasing AI-powered loan application review. The app provides a 4-step wizard where bank staff upload a loan application and bad examples, submit them to an AI API for analysis, and view the results.

The AI API (`https://dev-genie.001.gs/smart-api/loan-review`) is not yet built. We stub the integration with an adapter layer so the frontend can be built independently.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript (strict)
- Tailwind CSS v4, shadcn/ui (base-luma style)
- Zustand (client state)
- pnpm

## Main Flow

1. **Upload** — User uploads a single loan application PDF. Next disabled until file is uploaded.
2. **Bad Examples** — User uploads one or more PDFs of past bad loan applications for the AI to learn from. Next disabled until at least one file is uploaded.
3. **Processing** — User clicks "Submit for Review". Files are sent to a server-side API route which forwards them to the external AI API in the background. Client polls a status endpoint until the result is ready.
4. **Results** — The parsed AI analysis is displayed with risk score, findings, and recommendations.

## Architecture

```
Browser (Zustand)
  │
  ├── Step 1: Upload application PDF
  ├── Step 2: Upload bad example PDFs
  ├── Step 3: POST /api/loan-review → { jobId }
  │       Server starts background POST to external API
  │       Stores job in in-memory Map
  └── Step 4: Poll GET /api/loan-review/status?jobId=xxx
          Every 10s until complete → Show results
```

### Server-Side API Routes

**`POST /api/loan-review/route.ts`**

- Receives files as FormData from the client
- Generates a unique jobId (UUID)
- Stores job in memory as `{ status: "processing", startedAt: Date.now() }`
- Starts the external POST to `https://dev-genie.001.gs/smart-api/loan-review` with a 30-minute timeout
- Returns `{ jobId }` to the client immediately
- When the external API responds, updates job to `{ status: "complete", result: <raw response> }`
- If the external API fails, updates job to `{ status: "error", error: <message> }`
- `maxDuration: 1800` (30 minutes) configured via Next.js route export

**`GET /api/loan-review/status/route.ts`**

- Accepts `jobId` query parameter
- Looks up job in the in-memory store
- Returns `{ status, result?, error?, elapsedSeconds }`
- Returns 404 if jobId not found

### Job Store

In-memory `Map<string, Job>` stored in `lib/job-store.ts`. No persistence — server restarts wipe all jobs. Acceptable for a demo.

```ts
interface Job {
  status: "processing" | "complete" | "error"
  startedAt: number // Date.now()
  result?: unknown // Raw API response
  error?: string // Error message if failed
}
```

### Client State (Zustand)

```ts
interface LoanReviewState {
  step: 1 | 2 | 3 | 4
  applicationFile: File | null
  exampleFiles: File[]
  jobId: string | null
  result: ReviewResult | null
  error: string | null

  // Actions
  setStep: (step: number) => void
  setApplicationFile: (file: File | null) => void
  addExampleFiles: (files: File[]) => void
  removeExampleFile: (name: string) => void
  submit: () => Promise<void>
  reset: () => void
}
```

The `jobId` is also saved to `sessionStorage` for refresh recovery. On page load, if `sessionStorage` has a jobId, the app resumes polling that job.

### Response Adapter

Since the AI API response format is unknown, an adapter function maps the raw response to a known UI shape:

```ts
interface ReviewResult {
  summary: string
  riskScore: number // 0–100
  status: "approved" | "flagged" | "rejected"
  findings: Finding[]
  recommendations: string[]
}

interface Finding {
  category: string
  severity: "info" | "warning" | "critical"
  title: string
  description: string
}
```

The adapter (`lib/parse-response.ts`) returns a placeholder result for now. When the real API contract is known, only this function needs to change.

## Edge Cases

### Duplicate Submission Prevention

- Submit button is disabled after first click, replaced with a spinner
- Zustand `jobId` acts as a lock — if a job already exists, submit is blocked
- Back button is disabled on Step 3 once submission has started

### File Management

- Step 1: Uploading a new PDF replaces the previous one
- Step 2: Duplicate filenames are replaced, not added
- Each file in Step 2 has a "Remove" button
- File size limit: 10MB per file, rejected with inline error message
- File type: only `.pdf` accepted, anything else is rejected

### Processing Resilience

- `sessionStorage` stores jobId — on page refresh during Step 3, polling resumes
- Polling timeout: 30 minutes. If exceeded, shows error with "Retry" button
- External API error: shown to user with "Retry" button that starts a new job
- Polling network failure: retry up to 3 consecutive failures before showing error

### General

- "Start New Review" on Step 4 resets all Zustand state and clears sessionStorage
- Direct navigation to Step 3/4 without a jobId redirects to Step 1

## Results Page

```
┌──────────────────────────────────────────┐
│  Overall Status Badge                     │
│  [APPROVED] / [FLAGGED] / [REJECTED]     │
│                                           │
│  Risk Score          Summary              │
│  ┌─────────┐        Brief overall         │
│  │  72/100 │        assessment text        │
│  │  ▓▓▓▓▓░ │                              │
│  └─────────┘                              │
│                                           │
│  Findings (sorted by severity)            │
│  ┌────────────────────────────────────┐   │
│  │ ● Category         [SEVERITY]      │   │
│  │   Description of the finding...    │   │
│  └────────────────────────────────────┘   │
│                                           │
│  Recommendations                          │
│  1. Actionable item                       │
│  2. Actionable item                       │
│                                           │
│              [Start New Review]            │
└──────────────────────────────────────────┘
```

- Findings sorted: critical first, then warning, then info
- Risk score displayed as a visual gauge with color coding
- Status badge uses color: green (approved), amber (flagged), red (rejected)

## Logging

Server-side structured logging via `lib/logger.ts`. Uses `console.log` with ISO timestamps — no external library.

Format: `[ISO timestamp] LEVEL [route] Message | key: value`

Logged events:

- Job created (file counts, jobId)
- External API call started (URL)
- External API response received (status, duration)
- External API errors (status, body)
- Job status polls (jobId, status, elapsed time)
- Job timeouts
- File validation failures (size, type)

Example output:

```
[2026-04-06T10:15:32.001Z] INFO  [POST /api/loan-review] New job started: abc-123 | files: 1 application + 3 examples
[2026-04-06T10:15:32.002Z] INFO  [POST /api/loan-review] Forwarding to external API
[2026-04-06T10:25:33.456Z] INFO  [POST /api/loan-review] External API responded: abc-123 | status: 200 | duration: 10m1s
[2026-04-06T10:25:40.789Z] INFO  [GET /api/loan-review/status] Poll: abc-123 → complete (delivered)
```

## File Structure

```
app/
  page.tsx                              # Main wizard page
  layout.tsx                            # Existing root layout
  globals.css                           # Existing styles
  api/
    loan-review/
      route.ts                          # POST - start job
      status/
        route.ts                        # GET - poll job status

components/
  step-indicator.tsx                    # Horizontal 4-step stepper
  file-upload.tsx                       # Drag-and-drop + click upload zone
  upload-step.tsx                       # Step 1 content
  examples-step.tsx                     # Step 2 content
  processing-step.tsx                   # Step 3 content (timer + status)
  results-step.tsx                      # Step 4 content (findings + score)
  wizard-footer.tsx                     # Back/Next buttons

lib/
  job-store.ts                          # In-memory Map + getJob/setJob helpers
  parse-response.ts                     # Adapter: raw API response → ReviewResult
  logger.ts                             # Structured console logger
  utils.ts                              # Existing utilities

store/
  loan-review.ts                        # Zustand store

types/
  review.ts                             # ReviewResult, Finding, Job types
```

## Out of Scope

- Authentication / authorization
- Database or persistent storage
- Mobile / responsive layout (desktop demo)
- Dark mode customization (uses default theme)
- Multi-language / i18n
- Rate limiting
