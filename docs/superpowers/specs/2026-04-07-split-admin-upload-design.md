---
name: Split Admin Upload and Loan Review Pages
date: 2026-04-07
status: approved
---

# Split Admin Upload and Loan Review Pages

## Problem

The current app combines two distinct workflows in a single page wizard:
1. Uploading bad loan application examples (for AI training)
2. Submitting a loan application for AI review

These are separate concerns with different users and different APIs. They should be on separate pages.

## Solution

Split into two pages:

- **`/admin`** — Admin uploads bad loan examples to the risk learning API
- **`/` (main page)** — User uploads a single application for review (3-step wizard: Upload → Review → Results)

## `/admin` Page

**Purpose:** Internal admins upload past examples of problematic loan applications so the AI can learn risk patterns.

**Layout:** Simple page matching existing app style — header, upload area, file list, submit button. No sidebar, no nav.

**Behavior:**
- Multi-file upload (drag & drop + browse), PDF only, **50MB max per file**
- Dedupe files by filename
- On submit: POST all files as FormData to `/api/risk-learning` (internal proxy)
- Proxy forwards to `https://dev-genie.001.gs/smart-api/risk_learning_agent_s2`
- Show success/error message after upload
- No auth required

**New files:**
- `app/admin/page.tsx` — Admin upload page (client component)
- `app/api/risk-learning/route.ts` — API proxy to `risk_learning` endpoint

**Reusable:** Existing `FileUpload` component with a higher `maxFileSize` prop (50MB instead of 10MB).

## `/` Main Page Changes

**Remove:** Step 2 (Examples step) entirely. No more example file uploads in the review flow.

**New wizard flow (3 steps):**
1. **Upload** — Single application PDF upload (10MB max)
2. **Review** — Processing/polling state
3. **Results** — Risk score, findings, recommendations

**API change:** `submit()` in the Zustand store sends only the application file to `/api/loan-review` — no `examples` field in FormData.

## Store Changes (`store/loan-review.ts`)

- Remove `exampleFiles` state and `setExampleFiles` action
- Remove `step: 2 | 3 | 4` → change to `step: 1 | 2 | 3`
- `submit()` builds FormData with only the application file
- Remove step 2 from navigation logic (`handleNext`, `handleBack`, `canGoNext`)

## Component Changes

| File | Change |
|------|--------|
| `app/page.tsx` | Remove ExamplesStep import/render, update step logic from 4→3 steps |
| `components/step-indicator.tsx` | Update from 4 steps to 3: Upload, Review, Results |
| `components/examples-step.tsx` | Delete |
| `components/file-upload.tsx` | Add `maxFileSize` prop (default 10MB), used as 50MB on admin page |
| `store/loan-review.ts` | Remove `exampleFiles`, simplify step numbering |
| `app/api/loan-review/route.ts` | Stop reading/forwarding `examples` from FormData |

## Validation Rules

| Page | Format | Max size | Count |
|------|--------|----------|-------|
| `/admin` | PDF only | 50MB | 1+ files |
| `/` | PDF only | 10MB | 1 file |
