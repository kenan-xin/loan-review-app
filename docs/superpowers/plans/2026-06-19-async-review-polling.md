# Async Review Polling + Status History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the loan-review frontend from the old SSE-stream + fly.io-proxy flow to the new async dev-genie API (submit → poll status), with live per-item progress, a Status column in Review History, and TanStack Query owning all server state.

**Architecture:** Browser calls dev-genie directly (CORS `*`, public routes, no auth). TanStack Query v5 owns server state (submit mutation, status/result-status polling queries, history item, delete mutation); zustand is slimmed to pure UI state (`step`, `applicationFile`, `taskId`, `viewingId`, `resultLayout`). Pure functions derive the progress phase, per-loop counters, and adapt the completed `output` (ordered `[{Key,Value}]` arrays) into plain objects for `transformToReviewResult`. The fly.io proxy is removed.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), zustand 5, **@tanstack/react-query v5** (new), **Vitest** (new, dev), Tailwind v4, shadcn/base-ui, sonner.

**Reference spec:** `docs/superpowers/specs/2026-06-19-async-review-polling-design.md`

---

## File structure

```
NEW  components/query-provider.tsx     "use client" QueryClientProvider wrapper
NEW  lib/loan-review/api.ts            endpoint constants, types, fetchers (network only)
NEW  lib/loan-review/phase.ts          pure: adaptOutput, derivePhase, deriveProgress, dedupeNewestByFilename
NEW  lib/loan-review/phase.test.ts     Vitest unit tests for the pure functions
NEW  lib/loan-review/hooks.ts          "use client" React Query hooks
NEW  vitest.config.ts                  Vitest config (node env)
EDIT package.json                      add deps + "test" script
EDIT app/layout.tsx                    wrap children in <QueryProvider>
EDIT store/loan-review.ts              slim to UI state (+ persist taskId/viewingId)
EDIT app/page.tsx                      orchestrate submit/poll/view via hooks
EDIT components/processing-step.tsx    phase + per-loop counters from props
EDIT components/review-history.tsx     Status column, useResultStatuses, gate View on "done"
EDIT CLAUDE.md                         replace the proxy section with async-polling notes
DEL  proxy/                            entire directory
```

`components/results-step.tsx` is **unchanged** — the page keeps feeding it a `SimulationResult` via the `result` prop; only the source of that value changes.

---

## Task 1: Dependencies & test tooling

**Files:**
- Modify: `package.json` (deps + script)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
cd /home/kenan/work/loan-review-app
pnpm add @tanstack/react-query
pnpm add -D vitest
```

- [ ] **Step 2: Add the `test` script to `package.json`**

In `package.json`, add a `test` entry to `scripts` (place it after `typecheck`):

```json
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Verify the toolchain runs (no tests yet → exit 0 or "no test files")**

Run: `pnpm test`
Expected: Vitest runs and exits 0 with "no test files found" (the `--passWithNoTests` flag makes this a clean pass). The first real test arrives in Task 4.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore: add @tanstack/react-query and vitest"
```

---

## Task 2: QueryClient provider

**Files:**
- Create: `components/query-provider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/query-provider.tsx`**

```tsx
"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, refetchOnWindowFocus: false },
        },
      })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

- [ ] **Step 2: Wire it into `app/layout.tsx`**

Add the import near the other component imports:

```tsx
import { QueryProvider } from "@/components/query-provider"
```

Replace the existing body wrapper:

```tsx
      <body>
        <NuqsAdapter>
          <ThemeProvider>{children}</ThemeProvider>
        </NuqsAdapter>
        <Toaster richColors closeButton />
      </body>
```

with:

```tsx
      <body>
        <NuqsAdapter>
          <ThemeProvider>
            <QueryProvider>{children}</QueryProvider>
          </ThemeProvider>
        </NuqsAdapter>
        <Toaster richColors closeButton />
      </body>
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS (exit 0).

- [ ] **Step 4: Commit**

```bash
git add components/query-provider.tsx app/layout.tsx
git commit -m "feat: add react-query provider to layout"
```

---

## Task 3: API layer (types + fetchers)

**Files:**
- Create: `lib/loan-review/api.ts`

- [ ] **Step 1: Create `lib/loan-review/api.ts`**

```ts
import type { ReviewHistoryItem } from "@/types/review"

const GENIE_BASE = "https://dev-genie.001.gs/smart-api"

// ---- Types ----

export type TaskStatus = "running" | "success" | "failed"

export interface SubmitReviewResponse {
  taskID: string
  status: string
  startedAt: string
}

export interface NodeLog {
  message: string
  status: string
  startTime: string
  endTime: string
}

export interface NodeInfo {
  nodeId: string
  nodeName: string
  nodeType: string
  status: string
  error?: string
  logs: NodeLog[]
  startTime: string
  endTime: string
}

/** Ordered-map element used in the completed `output` payload. */
export interface KV {
  Key: string
  Value: unknown
}

export interface TaskOutput {
  id?: number
  ca: unknown
  result: unknown
  summary: unknown
  decision: unknown
}

export interface TaskStatusResponse {
  taskID: string
  status: TaskStatus
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  nodeInfos: NodeInfo[]
  output?: TaskOutput
}

export interface ResultStatus {
  id: number
  filename: string
  status: "initial" | "extracted" | "checked" | "done"
  created_at: string
  updated_at: string
}

// ---- Fetchers ----

export async function submitReview(file: File): Promise<SubmitReviewResponse> {
  const form = new FormData()
  form.append("ca", file)
  const res = await fetch(`${GENIE_BASE}/reviewer_v2`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`)
  return res.json()
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const res = await fetch(`${GENIE_BASE}/reviewer_v2/status/${taskId}`)
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`)
  return res.json()
}

export async function getResultStatuses(): Promise<ResultStatus[]> {
  const res = await fetch(`${GENIE_BASE}/hl-get-status`)
  if (!res.ok) throw new Error(`Status list failed: ${res.status}`)
  const data = (await res.json()) as { result?: string }
  if (!data.result) return []
  try {
    return JSON.parse(data.result) as ResultStatus[]
  } catch {
    return []
  }
}

export async function fetchFullHistory(): Promise<ReviewHistoryItem[]> {
  const res = await fetch(`${GENIE_BASE}/hl_retriever`)
  if (!res.ok) throw new Error(`History fetch failed: ${res.status}`)
  const data = (await res.json()) as { result?: string }
  if (!data.result) return []
  return JSON.parse(data.result) as ReviewHistoryItem[]
}

export async function deleteHistory(id: number): Promise<void> {
  const res = await fetch(`${GENIE_BASE}/mbl_delete_s2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: String(id) }),
  })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/loan-review/api.ts
git commit -m "feat: add loan-review dev-genie api layer"
```

---

## Task 4: `adaptOutput` (KV-array → plain object) — TDD

**Files:**
- Create: `lib/loan-review/phase.test.ts`
- Create: `lib/loan-review/phase.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/loan-review/phase.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { adaptOutput } from "./phase"

describe("adaptOutput", () => {
  it("converts a [{Key,Value}] array into a plain object", () => {
    const input = [
      { Key: "a", Value: 1 },
      { Key: "b", Value: "x" },
    ]
    expect(adaptOutput(input)).toEqual({ a: 1, b: "x" })
  })

  it("recurses into nested KV arrays and plain arrays", () => {
    const input = [
      {
        Key: "F_securities",
        Value: [
          { Key: "moa_pct", Value: 73 },
          { Key: "items", Value: [[{ Key: "n", Value: "one" }]] },
        ],
      },
    ]
    expect(adaptOutput(input)).toEqual({
      F_securities: { moa_pct: 73, items: [{ n: "one" }] },
    })
  })

  it("is idempotent on already-plain data", () => {
    const plain = { a: 1, b: [{ n: "one" }], c: "x" }
    expect(adaptOutput(plain)).toEqual(plain)
  })

  it("leaves empty arrays and scalars untouched", () => {
    expect(adaptOutput([])).toEqual([])
    expect(adaptOutput(5)).toBe(5)
    expect(adaptOutput(null)).toBe(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/loan-review/phase.test.ts`
Expected: FAIL — `adaptOutput` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/loan-review/phase.ts`:

```ts
import type { KV } from "./api"

function isKV(x: unknown): x is KV {
  return (
    !!x &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    "Key" in (x as object) &&
    "Value" in (x as object)
  )
}

/**
 * Idempotently convert dev-genie's ordered `[{Key,Value}]` arrays into plain
 * nested objects. Plain data passes through unchanged.
 */
export function adaptOutput(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isKV)) {
      const obj: Record<string, unknown> = {}
      for (const item of value as KV[]) obj[item.Key] = adaptOutput(item.Value)
      return obj
    }
    return value.map(adaptOutput)
  }
  if (value && typeof value === "object") {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      obj[k] = adaptOutput(v)
    }
    return obj
  }
  return value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/loan-review/phase.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/loan-review/phase.ts lib/loan-review/phase.test.ts
git commit -m "feat: add idempotent KV-array output adapter"
```

---

## Task 5: `derivePhase` — TDD

**Files:**
- Modify: `lib/loan-review/phase.test.ts`
- Modify: `lib/loan-review/phase.ts`

- [ ] **Step 1: Add the failing test**

In `lib/loan-review/phase.test.ts`, merge any new imports into the existing top-of-file import block (combine with imports from the same module — no duplicate import lines) and append the new code below:

```ts
import { derivePhase } from "./phase"
import type { NodeInfo } from "./api"

function node(nodeId: string, status: string): NodeInfo {
  return { nodeId, nodeName: "", nodeType: "", status, logs: [], startTime: "", endTime: "" }
}

describe("derivePhase", () => {
  it("returns completed when overall status is success", () => {
    expect(derivePhase([], "success")).toBe("completed")
  })

  it("returns processing when only start/response_3 are present", () => {
    expect(derivePhase([node("response_3", "success")], "running")).toBe("processing")
  })

  it("returns reading while the document reader runs", () => {
    expect(derivePhase([node("document_reader_1", "processing")], "running")).toBe("reading")
  })

  it("returns extracting while iterator_1 runs", () => {
    const nodes = [node("document_reader_1", "success"), node("iterator_1", "processing")]
    expect(derivePhase(nodes, "running")).toBe("extracting")
  })

  it("returns checking once iterator_2 is present", () => {
    const nodes = [
      node("iterator_1", "success"),
      node("database_8", "success"),
      node("iterator_2", "processing"),
    ]
    expect(derivePhase(nodes, "running")).toBe("checking")
  })

  it("returns finalising once llm_3 is present", () => {
    const nodes = [node("iterator_2", "success"), node("database_7", "success"), node("llm_3", "processing")]
    expect(derivePhase(nodes, "running")).toBe("finalising")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/loan-review/phase.test.ts`
Expected: FAIL — `derivePhase` not exported.

- [ ] **Step 3: Add the implementation**

In `lib/loan-review/phase.ts`, merge any new imports into the existing top-of-file import block (combine with imports from the same module — no duplicate import lines) and append the new code below:

```ts
import type { NodeInfo } from "./api"

export type ReviewPhase =
  | "processing"
  | "reading"
  | "extracting"
  | "checking"
  | "finalising"
  | "completed"

export function derivePhase(nodeInfos: NodeInfo[], status: string): ReviewPhase {
  if (status === "success") return "completed"

  const byId = new Map(nodeInfos.map((n) => [n.nodeId, n]))
  const present = (id: string) => byId.has(id)
  const succeeded = (id: string) => byId.get(id)?.status === "success"

  if (succeeded("end")) return "completed"
  if (present("llm_3")) return "finalising"
  if (succeeded("database_7") || present("iterator_2")) return "checking"
  if (succeeded("database_8") || present("iterator_1")) return "extracting"
  if (present("document_reader_1")) return "reading"
  return "processing"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/loan-review/phase.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add lib/loan-review/phase.ts lib/loan-review/phase.test.ts
git commit -m "feat: derive review phase from node infos"
```

---

## Task 6: `deriveProgress` — TDD

**Files:**
- Modify: `lib/loan-review/phase.test.ts`
- Modify: `lib/loan-review/phase.ts`

- [ ] **Step 1: Add the failing test**

In `lib/loan-review/phase.test.ts`, merge any new imports into the existing top-of-file import block (combine with imports from the same module — no duplicate import lines) and append the new code below:

```ts
import { deriveProgress } from "./phase"

describe("deriveProgress", () => {
  it("counts completed extraction chunks and rule batches", () => {
    const nodes: NodeInfo[] = []
    for (let i = 0; i < 43; i++) nodes.push(node(`iterator_1[${i}].llm_2`, "success"))
    for (let i = 0; i < 19; i++) nodes.push(node(`iterator_2[${i}].llm_1`, "success"))
    const p = deriveProgress(nodes)
    expect(p.extract.done).toBe(43)
    expect(p.extract.seen).toBe(43)
    expect(p.rules.done).toBe(19)
  })

  it("separates done from in-progress and uses distinct indices for seen", () => {
    const nodes = [
      node("iterator_1[0].llm_2", "success"),
      node("iterator_1[1].llm_2", "success"),
      node("iterator_1[2].llm_2", "processing"),
    ]
    const p = deriveProgress(nodes)
    expect(p.extract.done).toBe(2)
    expect(p.extract.inProgress).toBe(1)
    expect(p.extract.seen).toBe(3)
    expect(p.extract.done).toBeLessThan(p.extract.seen)
  })

  it("ignores non-matching nodes", () => {
    const p = deriveProgress([node("document_reader_1", "processing")])
    expect(p.extract.done).toBe(0)
    expect(p.rules.done).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/loan-review/phase.test.ts`
Expected: FAIL — `deriveProgress` not exported.

- [ ] **Step 3: Add the implementation**

In `lib/loan-review/phase.ts`, merge any new imports into the existing top-of-file import block (combine with imports from the same module — no duplicate import lines) and append the new code below:

```ts
export interface LoopProgress {
  done: number
  inProgress: number
  seen: number
}

export interface ReviewProgress {
  extract: LoopProgress
  rules: LoopProgress
}

function loopProgress(nodeInfos: NodeInfo[], re: RegExp): LoopProgress {
  const indices = new Set<number>()
  let done = 0
  let inProgress = 0
  for (const n of nodeInfos) {
    const m = re.exec(n.nodeId)
    if (!m) continue
    indices.add(Number(m[1]))
    if (n.status === "success") done++
    else if (n.status === "processing" || n.status === "running") inProgress++
  }
  return { done, inProgress, seen: indices.size }
}

export function deriveProgress(nodeInfos: NodeInfo[]): ReviewProgress {
  return {
    extract: loopProgress(nodeInfos, /^iterator_1\[(\d+)\]\.llm_2$/),
    rules: loopProgress(nodeInfos, /^iterator_2\[(\d+)\]\.llm_1$/),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/loan-review/phase.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/loan-review/phase.ts lib/loan-review/phase.test.ts
git commit -m "feat: derive per-loop extraction/rule progress counters"
```

---

## Task 7: `dedupeNewestByFilename` — TDD

**Files:**
- Modify: `lib/loan-review/phase.test.ts`
- Modify: `lib/loan-review/phase.ts`

- [ ] **Step 1: Add the failing test**

In `lib/loan-review/phase.test.ts`, merge any new imports into the existing top-of-file import block (combine with imports from the same module — no duplicate import lines) and append the new code below:

```ts
import { dedupeNewestByFilename } from "./phase"
import type { ResultStatus } from "./api"

function status(id: number, filename: string, created_at: string, s: ResultStatus["status"]): ResultStatus {
  return { id, filename, status: s, created_at, updated_at: created_at }
}

describe("dedupeNewestByFilename", () => {
  it("keeps only the newest row per filename", () => {
    const rows = [
      status(1, "a.pdf", "2026-06-01T00:00:00Z", "done"),
      status(2, "a.pdf", "2026-06-03T00:00:00Z", "initial"),
      status(3, "b.pdf", "2026-06-02T00:00:00Z", "checked"),
    ]
    const out = dedupeNewestByFilename(rows)
    expect(out).toHaveLength(2)
    const a = out.find((r) => r.filename === "a.pdf")!
    expect(a.id).toBe(2)
    expect(a.status).toBe("initial")
  })

  it("returns newest-first ordering", () => {
    const rows = [
      status(1, "old.pdf", "2026-06-01T00:00:00Z", "done"),
      status(2, "new.pdf", "2026-06-05T00:00:00Z", "done"),
    ]
    const out = dedupeNewestByFilename(rows)
    expect(out[0].filename).toBe("new.pdf")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/loan-review/phase.test.ts`
Expected: FAIL — `dedupeNewestByFilename` not exported.

- [ ] **Step 3: Add the implementation**

In `lib/loan-review/phase.ts`, merge any new imports into the existing top-of-file import block (combine with imports from the same module — no duplicate import lines) and append the new code below:

```ts
import type { ResultStatus } from "./api"

export function dedupeNewestByFilename(rows: ResultStatus[]): ResultStatus[] {
  const sorted = [...rows].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  )
  const seen = new Map<string, ResultStatus>()
  for (const row of sorted) {
    if (!seen.has(row.filename)) seen.set(row.filename, row)
  }
  return Array.from(seen.values())
}

export function hasNonTerminalStatus(rows: ResultStatus[]): boolean {
  return rows.some((r) => r.status !== "done")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (entire suite — adaptOutput, derivePhase, deriveProgress, dedupe).

- [ ] **Step 5: Commit**

```bash
git add lib/loan-review/phase.ts lib/loan-review/phase.test.ts
git commit -m "feat: dedupe result statuses newest-per-filename"
```

---

## Task 8: React Query hooks

**Files:**
- Create: `lib/loan-review/hooks.ts`

- [ ] **Step 1: Create `lib/loan-review/hooks.ts`**

```ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  submitReview,
  getTaskStatus,
  getResultStatuses,
  fetchFullHistory,
  deleteHistory,
  type TaskOutput,
  type ResultStatus,
} from "./api"
import {
  adaptOutput,
  derivePhase,
  deriveProgress,
  dedupeNewestByFilename,
  hasNonTerminalStatus,
  type ReviewPhase,
  type ReviewProgress,
} from "./phase"
import { transformToReviewResult } from "@/lib/simulate-review"
import type {
  SimulationResult,
  CaData,
  EvaluationRuleResult,
  EvaluationSummary,
  EvaluationDecision,
} from "@/types/review"

const TERMINAL = new Set(["success", "failed"])
const isTerminal = (s?: string) => !!s && TERMINAL.has(s)

function buildResult(output: TaskOutput): SimulationResult {
  return transformToReviewResult(
    adaptOutput(output.ca) as CaData,
    adaptOutput(output.result) as EvaluationRuleResult[],
    adaptOutput(output.summary) as EvaluationSummary,
    adaptOutput(output.decision) as EvaluationDecision
  )
}

export function useSubmitReview() {
  return useMutation({ mutationFn: (file: File) => submitReview(file) })
}

export interface UseTaskStatus {
  phase: ReviewPhase
  progress: ReviewProgress | null
  result: SimulationResult | null
  taskError: string | null
  isTerminal: boolean
  isLoading: boolean
}

export function useTaskStatus(taskId: string | null): UseTaskStatus {
  const query = useQuery({
    queryKey: ["taskStatus", taskId],
    queryFn: () => getTaskStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (q) => (isTerminal(q.state.data?.status) ? false : 3000),
  })

  const data = query.data
  const nodeInfos = data?.nodeInfos ?? []

  const phase: ReviewPhase = data ? derivePhase(nodeInfos, data.status) : "processing"
  const progress = data ? deriveProgress(nodeInfos) : null
  const result =
    data?.status === "success" && data.output ? buildResult(data.output) : null
  const taskError =
    data?.status === "failed"
      ? data.errorMessage ||
        nodeInfos.find((n) => n.status === "failed")?.error ||
        "Review failed"
      : null

  return {
    phase,
    progress,
    result,
    taskError,
    isTerminal: isTerminal(data?.status),
    isLoading: query.isPending && !!taskId,
  }
}

export function useResultStatuses() {
  return useQuery({
    queryKey: ["resultStatuses"],
    queryFn: getResultStatuses,
    select: dedupeNewestByFilename,
    refetchInterval: (q) => {
      const rows = q.state.data
      if (!rows) return 5000
      return hasNonTerminalStatus(rows) ? 5000 : false
    },
  })
}

export function useHistoryItem(id: number | null) {
  return useQuery({
    queryKey: ["historyItem", id],
    enabled: id != null,
    queryFn: async (): Promise<SimulationResult> => {
      const rows = await fetchFullHistory()
      const item = rows.find((r) => r.id === id)
      if (!item) throw new Error("Review not found")
      return transformToReviewResult(
        adaptOutput(JSON.parse(item.ca)) as CaData,
        adaptOutput(JSON.parse(item.result)) as EvaluationRuleResult[],
        adaptOutput(JSON.parse(item.summary)) as EvaluationSummary,
        adaptOutput(JSON.parse(item.decision)) as EvaluationDecision
      )
    },
  })
}

export function useDeleteHistory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteHistory(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["resultStatuses"] })
      const prev = qc.getQueryData<ResultStatus[]>(["resultStatuses"])
      qc.setQueryData<ResultStatus[]>(["resultStatuses"], (old) =>
        (old ?? []).filter((r) => r.id !== id)
      )
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["resultStatuses"], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["resultStatuses"] })
    },
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/loan-review/hooks.ts
git commit -m "feat: add react-query hooks for review flow"
```

---

## Task 9: Slim the zustand store

**Files:**
- Modify: `store/loan-review.ts` (full replacement)

- [ ] **Step 1: Replace `store/loan-review.ts` entirely**

```ts
import { create } from "zustand"
import { persist } from "zustand/middleware"

type ResultLayout = "sidebar" | "briefing" | "ledger"

interface LoanReviewState {
  step: 1 | 2 | 3
  applicationFile: File | null
  taskId: string | null
  viewingId: number | null
  resultLayout: ResultLayout

  setStep: (step: 1 | 2 | 3) => void
  setApplicationFile: (file: File | null) => void
  setTaskId: (taskId: string | null) => void
  setViewingId: (id: number | null) => void
  setResultLayout: (layout: ResultLayout) => void
  reset: () => void
}

export const useLoanReviewStore = create<LoanReviewState>()(
  persist(
    (set) => ({
      step: 1,
      applicationFile: null,
      taskId: null,
      viewingId: null,
      resultLayout: "sidebar",

      setStep: (step) => set({ step }),
      setApplicationFile: (applicationFile) => set({ applicationFile }),
      setTaskId: (taskId) => set({ taskId }),
      setViewingId: (viewingId) => set({ viewingId }),
      setResultLayout: (resultLayout) => set({ resultLayout }),
      reset: () =>
        set({
          step: 1,
          applicationFile: null,
          taskId: null,
          viewingId: null,
        }),
    }),
    {
      name: "loan-review",
      // Only persist what is needed to resume a mid-run review across refresh.
      partialize: (s) => ({ taskId: s.taskId, viewingId: s.viewingId }),
    }
  )
)
```

- [ ] **Step 2: Verify the store compiles in isolation (consumers updated in later tasks will still error — that's expected)**

Run: `pnpm typecheck`
Expected: errors **only** in files that still reference removed members (`app/page.tsx`, `components/processing-step.tsx`, `components/review-history.tsx`). The store file itself must have no errors. Those consumer errors are fixed in Tasks 10–12.

- [ ] **Step 3: Commit**

```bash
git add store/loan-review.ts
git commit -m "refactor: slim loan-review store to ui state"
```

---

## Task 10: Rewire `app/page.tsx`

**Files:**
- Modify: `app/page.tsx` (full replacement of the `LoanReviewWizard` component)

- [ ] **Step 1: Replace `app/page.tsx` entirely**

```tsx
"use client"

import { Suspense, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLoanReviewStore } from "@/store/loan-review"
import {
  useSubmitReview,
  useTaskStatus,
  useHistoryItem,
} from "@/lib/loan-review/hooks"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"
import { ChatBubble } from "@/components/chat-bubble"
import { Spinner } from "@/components/ui/spinner"

export default function Page() {
  return (
    <Suspense>
      <LoanReviewWizard />
    </Suspense>
  )
}

function LoanReviewWizard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const idParam = searchParams.get("id")

  const {
    step,
    applicationFile,
    taskId,
    viewingId,
    setStep,
    setApplicationFile,
    setTaskId,
    setViewingId,
    reset,
  } = useLoanReviewStore()

  const submitMut = useSubmitReview()
  const { phase, progress, result: liveResult, taskError, isLoading: statusLoading } =
    useTaskStatus(taskId)
  const historyItem = useHistoryItem(viewingId)

  // The result to render: a viewed history item takes precedence, else the live run.
  const result = viewingId != null ? (historyItem.data ?? null) : liveResult
  const error = taskError ?? (submitMut.error ? String(submitMut.error.message) : null)

  // On mount: open a shared link (?id=) or resume a persisted in-flight task.
  useEffect(() => {
    if (idParam) {
      const id = Number(idParam)
      if (!Number.isNaN(id)) {
        setViewingId(id)
        setStep(3)
      }
      return
    }
    const persisted = useLoanReviewStore.getState()
    if (persisted.viewingId != null) setStep(3)
    else if (persisted.taskId) setStep(2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Advance to results once a live run completes.
  useEffect(() => {
    if (liveResult && viewingId == null && step === 2) setStep(3)
  }, [liveResult, viewingId, step, setStep])

  // Browser history entries so the back button works.
  useEffect(() => {
    if (step === 2 || step === 3) window.history.pushState({ step }, "")
  }, [step])

  // Back button → return to upload, clearing the active run / viewed item.
  useEffect(() => {
    const onPopState = () => {
      if (useLoanReviewStore.getState().step > 1) {
        setStep(1)
        setTaskId(null)
        setViewingId(null)
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [setStep, setTaskId, setViewingId])

  const handleNext = () => {
    if (step !== 1 || !applicationFile) return
    submitMut.mutate(applicationFile, {
      onSuccess: (res) => {
        setTaskId(res.taskID)
        setStep(2)
      },
      onError: (e) => toast.error(`Could not start review: ${e.message}`),
    })
  }

  const handleRetry = () => {
    submitMut.reset()
    setTaskId(null)
    setViewingId(null)
    setStep(1)
    router.replace("/")
  }

  const handleReset = () => {
    reset()
    router.replace("/")
  }

  // Loading a shared review link.
  if (idParam && !result && historyItem.isLoading) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Loan Review</h1>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading review...
          </div>
        </main>
      </div>
    )
  }

  // Invalid/missing shared review link.
  if (idParam && !result && historyItem.isError) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Loan Review</h1>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <p className="text-sm text-muted-foreground">
            {String(historyItem.error?.message ?? "Review not found")}
          </p>
          <button
            onClick={handleReset}
            className="mt-4 text-sm underline text-primary"
          >
            Start New Review
          </button>
        </main>
      </div>
    )
  }

  const canGoNext = step === 1 && !!applicationFile

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review</h1>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="relative mb-6 flex w-full items-center justify-center">
          {step === 3 && (
            <button
              onClick={handleReset}
              className="absolute left-0 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          )}
          <StepIndicator currentStep={step} />
        </div>

        <div className="min-h-0 flex-1">
          {step === 1 && (
            <UploadStep file={applicationFile} onFileChange={setApplicationFile} />
          )}
          {step === 2 && (
            <ProcessingStep
              phase={phase}
              progress={progress}
              error={error}
              isLoading={statusLoading}
              onRetry={handleRetry}
            />
          )}
          {step === 3 && result && (
            <>
              <ResultsStep result={result} />
              <ChatBubble result={result} />
            </>
          )}
        </div>

        {step === 1 && (
          <div className="mt-8 border-t pt-4">
            <WizardFooter
              onNext={handleNext}
              nextLabel="Submit for Review"
              nextDisabled={!canGoNext}
              nextLoading={submitMut.isPending}
            />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify (page errors resolved; processing-step prop mismatch expected until Task 11)**

Run: `pnpm typecheck`
Expected: the only remaining errors are in `components/processing-step.tsx` (new props `phase`/`progress`/`isLoading`) and `components/review-history.tsx` (removed store members) — fixed next.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: orchestrate async review flow via react-query hooks"
```

---

## Task 11: Rewrite `components/processing-step.tsx`

**Files:**
- Modify: `components/processing-step.tsx` (full replacement)

- [ ] **Step 1: Replace `components/processing-step.tsx` entirely**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReviewPhase, ReviewProgress } from "@/lib/loan-review/phase"

interface ProcessingStepProps {
  phase: ReviewPhase
  progress: ReviewProgress | null
  error: string | null
  isLoading: boolean
  onRetry: () => void
}

const STAGES: Array<{ id: ReviewPhase; label: string }> = [
  { id: "reading", label: "Reading document" },
  { id: "extracting", label: "Extracting CA data" },
  { id: "checking", label: "Evaluating rules" },
  { id: "finalising", label: "Finalising review" },
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

function activeLabel(phase: ReviewPhase, progress: ReviewProgress | null): string {
  if (phase === "extracting" && progress) {
    return `Extracting CA data — ${progress.extract.done} chunk${progress.extract.done === 1 ? "" : "s"} done`
  }
  if (phase === "checking" && progress) {
    return `Evaluating rules — ${progress.rules.done} batch${progress.rules.done === 1 ? "" : "es"} done`
  }
  return STAGES.find((s) => s.id === phase)?.label ?? "Processing"
}

export function ProcessingStep({
  phase,
  progress,
  error,
  isLoading,
  onRetry,
}: ProcessingStepProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (error) return
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000)
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

  // Brief gap before the first poll resolves.
  if (isLoading && phase === "processing") {
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

  const activeIndex = STAGES.findIndex((s) => s.id === phase)

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-lg font-semibold">Processing Application</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Please wait while we analyse the documents
      </p>

      <div className="mt-6 w-full max-w-md rounded-lg border p-4 text-left shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
          <span className="text-sm font-medium">
            {activeLabel(phase, progress)}
            <AnimatedDots />
          </span>
        </div>

        {activeIndex > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            {STAGES.slice(0, activeIndex).map((s) => (
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
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Elapsed: {formatTime(elapsed)}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: processing-step errors resolved; only `components/review-history.tsx` errors remain.

- [ ] **Step 3: Commit**

```bash
git add components/processing-step.tsx
git commit -m "feat: phase + per-loop progress in processing step"
```

---

## Task 12: Rewrite `components/review-history.tsx`

**Files:**
- Modify: `components/review-history.tsx` (full replacement)

- [ ] **Step 1: Replace `components/review-history.tsx` entirely**

```tsx
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { useLoanReviewStore } from "@/store/loan-review"
import { useResultStatuses, useDeleteHistory } from "@/lib/loan-review/hooks"
import type { ResultStatus } from "@/lib/loan-review/api"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
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

const STATUS_LABEL: Record<ResultStatus["status"], string> = {
  initial: "Queued",
  extracted: "Extracting",
  checked: "Checking",
  done: "Done",
}

const STATUS_CLASS: Record<ResultStatus["status"], string> = {
  initial: "bg-muted text-muted-foreground",
  extracted: "bg-blue-100 text-blue-700",
  checked: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
}

function StatusBadge({ status }: { status: ResultStatus["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function DeleteButton({
  itemId,
  filename,
  onConfirm,
}: {
  itemId: number
  filename: string
  onConfirm: (id: number) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  const handleDelete = useCallback(async () => {
    setOpen(false)
    try {
      await onConfirm(itemId)
      toast.success(`"${filename}" deleted`)
    } catch {
      toast.error(`Failed to delete "${filename}"`)
    }
  }, [itemId, filename, onConfirm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${filename}`} />
        }
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-48 rounded-lg p-3" align="end">
        <PopoverTitle>Delete &quot;{filename}&quot;?</PopoverTitle>
        <PopoverDescription>This action cannot be undone.</PopoverDescription>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ReviewHistory() {
  const router = useRouter()
  const setViewingId = useLoanReviewStore((s) => s.setViewingId)
  const { data: rows = [], isLoading, isError } = useResultStatuses()
  const deleteMut = useDeleteHistory()

  const handleDelete = useCallback(
    (id: number) => deleteMut.mutateAsync(id),
    [deleteMut]
  )

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <h2 className="text-lg font-semibold">Review History</h2>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner />
          Loading review history...
        </div>
      )}

      {isError && (
        <p className="py-4 text-sm text-muted-foreground">
          Could not load review history.
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">No previous reviews.</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Filename</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Created At</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const isDone = item.status === "done"
                return (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-2.5">{item.filename}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!isDone}
                          title={isDone ? undefined : "Review still in progress"}
                          onClick={() => {
                            setViewingId(item.id)
                            router.push(`/?id=${item.id}`)
                          }}
                        >
                          View
                        </Button>
                        <DeleteButton
                          itemId={item.id}
                          filename={item.filename}
                          onConfirm={handleDelete}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the whole project type-checks**

Run: `pnpm typecheck`
Expected: PASS (exit 0) — all store-consumer errors resolved.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: PASS (no errors). Fix any reported issues (e.g. unused imports) before committing.

- [ ] **Step 4: Commit**

```bash
git add components/review-history.tsx
git commit -m "feat: status column + polling in review history"
```

---

## Task 13: Remove the fly.io proxy & update docs

**Files:**
- Delete: `proxy/` (entire directory)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Confirm nothing references the proxy env var anymore**

Run: `grep -rn "NEXT_PUBLIC_PROXY_URL_V2\|loan-review-v2\|loan-review-proxy" --include=*.ts --include=*.tsx . | grep -v node_modules`
Expected: **no matches** (the store rewrite in Task 9 removed the last usage). If any remain, resolve them before continuing.

- [ ] **Step 2: Delete the proxy directory**

```bash
git rm -r proxy
```

- [ ] **Step 3: Replace the proxy section in `CLAUDE.md`**

In `CLAUDE.md`, delete the entire section that begins with `## Architecture: Proxy for Loan Review Submission` (through the end of its bullet list about `fetchReviewHistory`/`deleteHistoryItem`) and replace it with:

```markdown
## Architecture: Async Review Submission (polling)

The loan-review flow calls `dev-genie.001.gs/smart-api/*` **directly from the browser** (genie-core CORS is `*`; the published smart-API routes are public/unauthenticated).

```
Browser ──POST multipart──> dev-genie/reviewer_v2            → { taskID }
Browser ──GET poll (3s)───> dev-genie/reviewer_v2/status/:id → nodeInfos + status (+ output on success)
Browser ──GET poll (5s)───> dev-genie/hl-get-status          → result statuses for history
```

**Key points:**

- `reviewer_v2` is **async**: submit returns a `taskID`; the browser polls `reviewer_v2/status/:taskID` until `status` is `success` (carries `output.{ca,result,summary,decision}` as ordered `[{Key,Value}]` arrays) or `failed` (carries `errorMessage`).
- **TanStack Query** owns all server state and polling (`lib/loan-review/hooks.ts`); polling auto-stops on terminal state. Pure derivations live in `lib/loan-review/phase.ts`.
- The old fly.io proxy was removed — it only existed to dodge Vercel's 60 s streaming timeout, which no longer applies now that every request is short. (The fly.io machine, if still running, can be decommissioned separately with `fly apps destroy`.)
- History (`hl_retriever`) and delete (`mbl_delete_s2`) also call `dev-genie` directly.
```

- [ ] **Step 4: Verify build still succeeds without the proxy**

Run: `pnpm build`
Expected: PASS (production build completes).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove fly.io proxy, update CLAUDE.md for async polling"
```

---

## Task 14: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all `lib/loan-review/phase.test.ts` suites green.

- [ ] **Step 2: Typecheck + lint + build**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all PASS.

- [ ] **Step 3: Manual smoke test (dev server)**

Run: `pnpm dev`, open the app, then verify each:
- Upload a PDF → Submit → step 2 shows phases advancing (`Reading document` → `Extracting CA data — N chunks done` → `Evaluating rules — N batches done` → `Finalising review`).
- On completion → step 3 renders the results (same UI as before).
- Review History shows a **Status** column; an in-progress row shows its live status and a **disabled** View button; a `done` row's View opens the result.
- Delete a history row → it disappears optimistically; a failure rolls it back with a toast.
- Refresh mid-run → polling resumes (persisted `taskId`).

Expected: all behave as described. If `reviewer_v2/status` returns an unexpected `failed` shape, capture it and confirm the error path surfaces `errorMessage`.

- [ ] **Step 4: Final commit (if the manual pass required tweaks)**

```bash
git add -A
git commit -m "test: verify async review polling end-to-end"
```

---

## Notes for the implementer

- **No `@/` alias in test files** — the pure-function tests use relative imports (`./phase`, `./api`) so Vitest's default resolver works without extra config.
- **Hydration:** the store persists `taskId`/`viewingId` only; `step` is derived on mount. If you see a hydration warning on first paint, it is from the persisted-state mount effect and is benign for this demo; do not add SSR persistence shims unless asked.
- **`refetchInterval` reads raw data** (`q.state.data`), not the `select`-transformed value — this is why `useResultStatuses` dedupes via `select` while the interval callback still inspects the raw rows.
- **Do not** reintroduce a server route or proxy for these calls without revisiting the spec — browser-direct is intentional (spec §4).
