# Async Review Polling + Status History — Design Spec

- **Date:** 2026-06-19
- **Status:** Approved (pending final spec review)
- **Author:** kenan.xin (with Claude)

## 1. Background

The `dev-genie.001.gs/smart-api/reviewer_v2` API changed from a **synchronous SSE stream** to an **async task model**:

1. `POST reviewer_v2` (multipart `ca`) now returns immediately:
   ```json
   { "taskID": "6a34cf09...", "status": "running", "startedAt": "2026-06-19T05:09:29.163Z" }
   ```
2. The client polls `GET reviewer_v2/status/{taskID}` for progress (`nodeInfos` + overall `status`).
3. On completion the status response carries the full result payload (see §3).

A second new endpoint, `GET hl-get-status`, returns lightweight status rows for the result table (no heavy payload):
```json
{ "result": "[{\"id\":147,\"filename\":\"...\",\"status\":\"initial\",\"created_at\":\"...\",\"updated_at\":\"...\"}, ...]" }
```
where `status` ∈ `initial | extracted | checked | done`.

The current frontend (`store/loan-review.ts`) is built around the old SSE stream and a fly.io proxy that existed **only** to dodge Vercel's 60 s function timeout on a multi-minute stream. With polling, every request is short, so that constraint disappears.

## 2. Goals / Non-goals

**Goals**
- Review page polls task status and shows progress phases (reading → extracting → checking → finalising → completed).
- Review page shows **live per-item progress** for both the extraction loop (chunks) and the rule-evaluation loop (batches) — a counter that ticks up as items complete.
- Review History gains a **Status** column, polls `hl-get-status`, and only allows viewing a row when its status is `done`.
- Use **TanStack Query v5** for all dev-genie calls and polling (caching, dedup, lifecycle, better UX).
- Remove the now-unnecessary fly.io proxy from the codebase.

**Non-goals**
- Changing the dev-genie workflow itself.
- Decommissioning the running fly.io machine (`fly apps destroy`) — code stops referencing it; teardown is a separate manual op.

## 3. API contract (browser → `dev-genie.001.gs/smart-api/*`, CORS `*`)

| Function | Method / path | Response (shape) |
|---|---|---|
| `submitReview(file)` | `POST reviewer_v2` (multipart `ca`) | `{ taskID, status, startedAt }` |
| `getTaskStatus(taskId)` | `GET reviewer_v2/status/{taskId}` | `{ taskID, status, startedAt, completedAt?, nodeInfos[], output? }` |
| `getResultStatuses()` | `GET hl-get-status` | `{ result: "<json string: ResultStatus[]>" }` |
| `fetchFullHistory()` | `GET hl_retriever` (existing) | `{ result: "<json string: full rows>" }` |
| `deleteHistory(id)` | `POST mbl_delete_s2` (existing) | `{ ok }` |

**Task `status`:** `running` while in progress; `success` on completion; `failed` on error. **Verified** in genie-core (`app/agent/model/workflow.go` `BaseResponse`): on failure the response carries a top-level **`errorMessage: string`**, and the failing node in `nodeInfos` (`LightNodeInfo`) carries its own **`error: string`** + `status: "failed"`. The generic `GET {resource}/status/:taskID` route is registered for every smart API (`setupSmartAPIRoute`), so `reviewer_v2/status/{taskId}` is confirmed real.

**Auth: none required (verified).** Public smart-API routes are registered via `setupSmartAPIRoute(..., isInternalRoute=false)`, which appends `auth.Middleware` **only** when `isInternalRoute` is true. `reviewer_v2`, `reviewer_v2/status`, `hl-get-status`, `hl_retriever`, `mbl_delete_s2` are public/unauthenticated — matching the existing browser calls. No auth header needed.

**Completed `output` shape (important):** on `status: "success"`, the status response includes:
```json
"output": { "ca": [...], "result": [...], "summary": [...], "decision": [...], "id": 147 }
```
where each of `ca`/`result`/`summary`/`decision` is an **ordered `[{ "Key":…, "Value":… }]` array** (Go ordered-map serialization), NOT a plain nested object.

> **Verified:** `lib/simulate-review.ts:transformToReviewResult` uses plain property access (`caData.A_basic_information`, `r.result`, `r.required_fields`, `evaluationSummary.total_rules_evaluated`) — it expects **plain nested objects** and does **not** handle the KV-array form. The existing history path (`viewHistoryItem` → `JSON.parse(item.ca)` → transform) works today, which means `hl_retriever` returns **plain-object** JSON. So the polled `output` (KV-array) genuinely needs the `adaptOutput` adapter (§6.3); the history path does not. To stay safe against backend drift, `adaptOutput` is **idempotent** (passes plain data through) and is applied on both paths.

**`ResultStatus`** (parsed from `hl-get-status`): `{ id: number, filename: string, status: "initial"|"extracted"|"checked"|"done", created_at: string, updated_at: string }`.

## 4. Architecture: browser-direct, no proxy

All calls go **browser → dev-genie directly** (the pattern history/delete already use). The fly.io proxy and `NEXT_PUBLIC_PROXY_URL_V2` are removed.

### State management split

- **Server state → TanStack Query v5**: submit, task status (polling), result statuses (polling), full history item, delete.
- **Client/UI state → zustand (slimmed)**: `step`, `applicationFile`, `taskId`, `viewingId`, `resultLayout`.
- `result` and `stage` are **derived** from query data via hooks — not stored.

### Provider

Add `components/query-provider.tsx` (`"use client"`) that instantiates a `QueryClient` (stored in `useState` so it's stable across renders) and renders `QueryClientProvider`. Wire it in `app/layout.tsx` **inside** `ThemeProvider`:

```
NuqsAdapter → ThemeProvider → QueryProvider → {children}
```

Default `QueryClient` options: `queries: { retry: 2, refetchOnWindowFocus: false }` (polling handles freshness; window-focus refetch would be noisy).

## 5. File-level changes

```
NEW  components/query-provider.tsx          QueryClientProvider wrapper
NEW  lib/loan-review/api.ts                 typed fetchers + endpoint constants + types
NEW  lib/loan-review/hooks.ts               useSubmitReview / useTaskStatus / useResultStatuses / useHistoryItem / useDeleteHistory
NEW  lib/loan-review/phase.ts               derivePhase + deriveProgress + adaptOutput(KV→object) (pure fns)
EDIT app/layout.tsx                         add QueryProvider
EDIT store/loan-review.ts                   slim to UI state; remove SSE + manual history + polling
EDIT components/processing-step.tsx         drive phases from useTaskStatus
EDIT components/review-history.tsx          status column; drive from useResultStatuses; gate View on "done"
EDIT components/results-step.tsx (+ callers) read result from a query-derived hook instead of store.result
EDIT CLAUDE.md                              replace the proxy section with the async-polling description
DEL  proxy/                                 entire directory
DEL  NEXT_PUBLIC_PROXY_URL_V2               remove from env/usage
```

## 6. Detailed design

### 6.1 Review page — submit + polling

Flow orchestrated by the upload/processing components via hooks:

1. `useSubmitReview()` mutation → `POST reviewer_v2`; `onSuccess`: `store.setTaskId(taskID)`, `store.setStep(2)`.
2. `useTaskStatus(taskId)` query:
   - `enabled: !!taskId`
   - `refetchInterval: (query) => isTerminal(query.state.data?.status) ? false : 3000`
   - `isTerminal` = `status === "success" || status === "failed"`.
3. `ProcessingStep` derives the current **phase** from the query data via `derivePhase` and renders it.
4. On `status === "success"`: an effect in the controller advances `store.setStep(3)`. The results view reads the transformed result from the same query data (via `useActiveReviewResult`, §6.4).
5. On `status === "failed"` (or a node-level failure, or N consecutive network errors, or hard timeout ~20 min): surface the error in `ProcessingStep` (reuse existing error UI + the "openrouter → provider error" friendly mapping).

**Phase model** (replaces the 3-value `SseStage`): `processing → reading → extracting → checking → finalising → completed`, where `processing` is the brief initial/queued state (start/`response_3`) before the document reader runs.

`derivePhase(nodeInfos, status)` picks the furthest milestone reached, checking markers in reverse priority order:

| Phase | Reached when |
|---|---|
| `completed` | overall `status === "success"` (or `end` node success) |
| `finalising` | `llm_3` present (running or success) |
| `checking` | `database_7` ("Update Result Status - Checked") success, or `iterator_2` running |
| `extracting` | `database_8` ("Update Result Status - Extracted") success, or `iterator_1` running |
| `reading` | `document_reader_1` running/success |
| `processing` | default / `response_3` (initial) |

These align 1:1 with `hl-get-status` coarse values (`initial → extracted → checked → done`).

**Per-item progress** (`deriveProgress(nodeInfos)`): the status response carries no total/index/output field, so progress is derived purely by **counting iterator child nodes** by id:

- **Extraction:** match `iterator_1[N].llm_2`. `done` = count with `status === "success"`; `inProgress` = count `processing`/`running`; `seen` = distinct `iterator_1[N]` indices present.
- **Rule evaluation:** match `iterator_2[N].llm_1`. Same three counts.

Returned shape: `{ extract: { done, inProgress, seen }, rules: { done, inProgress, seen } }`.

> **No reliable total.** The iterator spawns items incrementally, so during a running poll only spawned indices exist; `seen` (=`max index + 1`) is a **monotonically rising lower bound**, not the final total (the completed sample has 43 extraction chunks / 19 rule batches, but a mid-run poll showed only ~18 spawned). The final total is only known once that iterator's status flips to `success`.

**Display:** show a live "done" counter during the relevant phase — `Extracting CA data — {extract.done} chunks done` and `Evaluating rules — {rules.done} batches done`. The `done / seen` fraction MAY be shown as a secondary, best-effort hint (e.g. a subtle progress bar) but the headline is the absolute done count so the number never appears to go "backwards" when `seen` jumps. The counter ticking up is the key liveness signal during the multi-minute extraction/checking phases.

### 6.2 Review History — status column + polling

- `useResultStatuses()` query → parses `hl-get-status` `result` string → `ResultStatus[]`, deduped to **newest-per-filename** (sorted by `created_at` desc, keep first per filename — matches the chosen behaviour).
  - `refetchInterval: (query) => hasNonTerminal(rows) ? 5000 : false`, where non-terminal = status not in `{done}` (and not `failed` if present).
- Table renders a new **Status** column → badge mapping: `initial`→"Queued", `extracted`→"Extracting", `checked`→"Checking", `done`→"Done" (with colour). Exact wording/colours are an implementation detail, not a blocker.
- **View** button: enabled only when `status === "done"`; otherwise disabled, showing the live status.
- Opening a done row → `useHistoryItem(id)` (or `fetchFullHistory` + select by `id`) returns the full row; reuse the existing transform path to populate the results view. `store.viewingId` tracks which row is open; navigation reuses the existing `router.push('/?id=...')`.
- `useDeleteHistory()` mutation → `onMutate` optimistic removal (replaces the old `deletingIds` array), `onError` rollback + toast, `onSuccess` invalidate `['resultStatuses']`.

### 6.3 KV-array adapter (`adaptOutput`)

Pure, **idempotent** function converting the KV-array form into the plain nested object/array form `transformToReviewResult` expects. Recursively: an array whose elements are all `{Key, Value}` objects → object keyed by `Key`; values recursively adapted; a plain (non-KV) array maps element-wise; scalars/already-plain objects pass through unchanged. Applied to `ca/result/summary/decision` on **both** the polled-output path and the history path (no-op when data is already plain), so a backend that later returns KV arrays from `hl_retriever` is handled transparently.

### 6.4 Hooks summary (`lib/loan-review/hooks.ts`)

- `useSubmitReview()` → `useMutation`.
- `useTaskStatus(taskId)` → `useQuery`, polling, exposes `{ phase, progress, result?, error?, isTerminal }` (phase via `derivePhase`, `progress` via `deriveProgress`, result via `adaptOutput`+`transformToReviewResult` when success).
- `useResultStatuses()` → `useQuery`, polling, returns deduped `ResultStatus[]`.
- `useHistoryItem(id)` → `useQuery` enabled when `id` set; returns transformed result for viewing.
- `useDeleteHistory()` → `useMutation` with optimistic update + invalidation.
- `useActiveReviewResult()` → selects between the active task result and a viewed history item based on `store.viewingId`/`taskId`.

### 6.5 Store (`store/loan-review.ts`) after slimming

Keep: `step`, `applicationFile`, `taskId`, `viewingId`, `resultLayout` + their setters, `reset()`.
Remove: `submit()` SSE logic, `SseStage`/`NODE_TO_STAGE`/`STAGE_INDEX`, `ruleIndex`, `fetchReviewHistory`, `viewHistoryItem`/`loadHistoryById` (logic moves into hooks/components), `deleteHistoryItem`, `reviewHistory`, `isLoadingHistory`, `historyError`, `deletingIds`, `result`/`stage` (now derived), `isSubmitting` (use mutation/query `isPending`).

## 7. Error handling & edge cases

- Network blips during polling: TanStack Query `retry: 2`; only surface an error after retries are exhausted or the hard timeout (~20 min) elapses.
- dev-genie `failed` status: surface the top-level **`errorMessage`** (and, when present, the failing node's `nodeInfos[].error`), mapped through the existing friendly mapping (e.g. "openrouter → provider error").
- Empty/parse-failure on `hl-get-status` `result` string: treat as empty list, keep last good data, log.
- Delete failure: optimistic rollback + toast.

## 8. Resume after refresh (included)

Persist `taskId` to `localStorage` (e.g. via zustand `persist` on that field, or manual). On mount, if a `taskId` exists and the app is at step 2, `useTaskStatus` resumes polling automatically — a mid-run refresh continues instead of losing the review. Cleared on `reset()` and on terminal completion handling.

## 9. Testing

Unit tests for the pure functions (use the real captured snapshots `~/Desktop/sample.txt` (completed) and the running snapshot as fixtures):
- `derivePhase` — running snapshot → `extracting`; the completed snapshot → `completed`; mid-checking snapshot → `checking`.
- `deriveProgress` — completed snapshot → `extract.done === 43`, `rules.done === 19`; a mid-run snapshot → `done < seen` and counts only `success` children.
- `adaptOutput` — KV-array → nested object round-trip on a representative `output.ca` slice.
- History dedupe/merge — multiple runs of the same filename collapse to newest; status surfaced correctly; non-terminal detection drives polling on/off.

## 10. Defaults

- Review poll **3 s**; History poll **5 s**; hard timeout **20 min**.
- Resume-on-refresh: **included**.
- Per-item progress counters (extraction chunks + rule batches): **included**, shown as live "done" counts (denominator best-effort only).
- TanStack Query: **v5**, `retry: 2`, `refetchOnWindowFocus: false`.

## 11. Verified findings (resolved)

All four originally-open items were verified against `lib/simulate-review.ts` and the `genie-core` source:

1. **KV-array vs `transformToReviewResult` — adapter IS required.** `transformToReviewResult` uses plain property access and does not handle `[{Key,Value}]`. The polled `output` is KV-array, so `adaptOutput` is real (made idempotent, applied on both paths). §3, §6.3.
2. **`failed` shape — known.** `BaseResponse` (genie-core `app/agent/model/workflow.go`) exposes top-level `status` + `errorMessage`; `LightNodeInfo` exposes per-node `error` + `status`. Error path reads both. §3, §7.
3. **Auth — none needed.** Public smart-API routes attach `auth.Middleware` only when `isInternalRoute` is true; the published routes used here are public/unauthenticated (consistent with existing browser calls). §3.
4. **`hl_retriever` view data — intact.** The existing `viewHistoryItem` path consumes plain-object JSON from `hl_retriever` and works today; the idempotent `adaptOutput` also covers any future KV-array drift. §3, §6.2, §6.3.

No remaining blockers.
