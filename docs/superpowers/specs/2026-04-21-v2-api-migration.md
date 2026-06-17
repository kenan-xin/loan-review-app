# v2 Real-Stream Migration + Fly.io Proxy + Weight Removal

**Confidence: 9/10.** High on stream shape (both v1 + v2 SSE captured, parsed, and diffed). High on UI scope after clarifying Q&A with user. v2 backend shape is nearly identical to v1 — the only rule-level schema change is `category_5c` → `risk_category` (verbose string).

## Context

v2 currently fakes a 2-min delay, loads `app/data/*.json` mocks, and the landing page short-circuits via `DEBUG_SKIP_PROCESSING`. Backend `https://dev-genie.001.gs/smart-api/reviewer_v2` is live and streams SSE similar in envelope to v1 but missing all risk-score fields. Vercel's 300 s limit + the stream's multi-minute duration mean we must proxy through Fly.io (same pattern as v1's `loan-review-proxy`). v1 and v2 run side-by-side — new Fly app, new Vercel env.

## v2 SSE contract (derived from `/home/kenan/Desktop/v2_sse.txt`)

- Frames: `data: <json>\n\n`, `: heartbeat`, initial `retry: 2147483647`. No `event:` headers.
- Envelope: `{codeStatus, eventType, nodeID, output, status, ...}`
- Stream events:
  - `nodeID:"response_3"` → `output:{status:"processing the document"}`
  - `nodeID:"response_1"` → `output:{index, status:"extracting"}` (index 0..N)
  - `nodeID:"response_2"` → `output:{index, status:"checking"}` (index 0..M)
  - `nodeID:"end"` envelope `status:"completed"` → `output:{ca, summary, decision, result}`
- Rules do NOT stream; only indexes. Final payload arrives in `end`.

## Mock vs. real backend (v1 and v2)

Verified from `/home/kenan/Desktop/v1_sse.txt` and `/home/kenan/Desktop/v2_sse.txt`:

- **`risk_score`, `risk_band`, `by_risk_category`, `risk_summaries` are MOCK-ONLY inventions** — neither v1 nor v2 backend ever emits them. All computation must be client-side or deleted.
- `summary.by_risk_level` on real backend is `{high_fail_count, medium_fail_count, low_fail_count}` only (mock's v1/v2 types had richer shape).
- `summary.by_category[x]` on real backend has `{fail, missing, pass, warning}` — no `na`.
- Rules on both v1 and v2 already carry the "new" fields: `risk_level`, `required_fields`, `source_evidence`, `source_file`, `validation_logic`. These are not new to v2 — the v2-mock dataset just happened to drop them.
- `ca.D_shareholding_changes` absent in v2 sample — marked optional in type (backend references it in `decision.missing_information`, may appear in other CA files; CA data panel never renders it).

**Only real v1→v2 schema delta:** rule items lose `category_5c` (5 C's: Capacity/Capital/Character/Collateral/Conditions) and gain `risk_category` (verbose string: "Management risk", "Cashflow / Capacity risk / Cash conversion cycle", etc.). `summary.by_category` keys follow the same change — 5 C's in v1, verbose names in v2.

## Summary vs result array discrepancy

The backend `summary` object disagrees with the actual `result` array:

| Status | Summary | Actual rules |
|--------|---------|-------------|
| PASS | 40 | 38 |
| FAIL | 7 | 6 |
| WARNING | 16 | 16 |
| MISSING | 7 | 9 |
| N/A | 11 | 37 |
| **Total** | **81** | **106** |

**Decision: use `summary` as authoritative source** for risk score and sidebar counts. The result array is for rendering individual rules only.

## Decisions (from clarifying Q&A)

- **Risk score** → client-computed: `summary.total_pass / summary.total_rules_evaluated * 100`. Use summary totals, not rule array counts.
- **Risk band** → client-derived from the unweighted score. Helper in `lib/risk-band.ts`: `deriveRiskBand(score): "low"|"medium"|"high"` → `score ≥ 70 → "low"`, `40–69 → "medium"`, `< 40 → "high"`. Attach to `SimulationResult` as `riskBand` field so consumers read `result.riskBand`.
- **N/A rules** → **remove entirely**. Filter out all rules with `result === "N/A"` from the result array before any processing, display, or calculation. Remove N/A from `RULE_STATUS_ORDER` in `risk-category-section.tsx`. (N/A was never in the `STATUS_OPTIONS` filter chips — no change needed there. `RESULT_CONFIG["N/A"]` can stay defensively.)
- **Progress** → 4-stage SSE stepper: "Processing document" → "Extracting" → "Checking" → "Completed". Driven by `output.status` strings. No index counter, no progress bar — stage labels only.
- **Fly app**: `loan-review-proxy-v2`, path `POST /api/loan-review-v2`. Vercel env: `NEXT_PUBLIC_PROXY_URL_V2`.
- **Category grouping**: 9 backend strings → existing 9 `RiskCategoryId` via `CATEGORY_STRING_TO_ID` lookup. Drop `KEYWORD_RULES` + `MANUAL_OVERRIDES` + `mapRuleToRiskCategory`.
- **Secondary chip on rule items** → **remove entirely**. Don't replace `category_5c` with `risk_level`. The category is visible from the section header above — no chip needed.
- **New rule fields rendered in expanded risk item** (only when non-empty):
  - `REQUIRED FIELDS` (`rule.required_fields`) — bullet list.
  - `SOURCE EVIDENCE` (`rule.source_evidence` array) — bullet list.
  - `SOURCE FILE` (`rule.source_file`) — one-liner; hide when null.
  - Do NOT render `validation_logic`.
  - Match the existing ACTION uppercase-label-+-panel style.
- **Empty categories** → **show all 9 always**, even with 0 rules. Remove the `if (catRules.length === 0) return null` guard in `risk-panel.tsx`.
- **AI summary**:
  - Sidebar: already uses `decision.reasoning` (`result-sidebar.tsx:137-149`) — keep as-is.
  - Briefing / ledger / risk-panel per-category AI summary: backend has no per-category source. Keep the `risk_summaries: Record<string,string>` prop chain intact, but feed placeholder text for every `RiskCategoryId` — UI stays visually identical until real per-category summaries land. In `components/results-step.tsx:27`, build `riskSummaries = Object.fromEntries(RISK_CATEGORIES.map((c) => [c.id, "No AI summary available yet."]))`.
  - Don't add `decision.reasoning` to briefing/ledger headers — sidebar-only.
- **Gauge inversion** → invert `TRACK_DATA` in `components/results/risk-meter.tsx` so higher pass-rate = green zone on the right. New zones: `0–40 red`, `40–70 amber`, `70–100 emerald`.
- **Dead code cleanup**: delete `lib/risk-score.ts`, remove `weight` from `RiskCategory` interface and all 9 literals, remove `KEYWORD_RULES`, `MANUAL_OVERRIDES`, `mapRuleToRiskCategory` from `lib/risk-framework.ts`. Add `CATEGORY_STRING_TO_ID` lookup.

---

## Phase 1 — Types & SSE contract (pure types, compiles to zero runtime change)

Files:
- `types/review.ts`
  - `EvaluationRuleResult`: drop `category_5c`; add `risk_level:"High"|"Medium"|"Low"`, `required_fields:string[]`, `source_evidence:string[]`, `source_file:string|null`, `validation_logic:string`. Change `risk_category` from `RiskCategoryId` to `string` (backend delivers full name).
  - `EvaluationSummary`: drop `risk_score`, `risk_band`, `by_risk_category`, `risk_summaries`. Change `by_risk_level` to `{high_fail_count, medium_fail_count, low_fail_count}`. Per-category entries: drop `na`.
  - `CaData`: make ALL fields optional (`?`) — every CA application is different and any section may be absent. Guard all reads with optional chaining. CA data panel must handle missing sections gracefully.
  - `ReviewResult.riskScore`: keep (client-computed from summary).
  - Add `riskBand: "low"|"medium"|"high"` to `SimulationResult` (client-derived).
- `types/sse.ts` (new): SSE envelope + per-node output types for type-safe parsing.

## Phase 2 — Remove weight system + dead code cleanup

Files:
- `lib/risk-framework.ts`:
  - `RiskCategory.weight: number` → **delete**; purge all 9 `weight` literals.
  - **Delete** `KEYWORD_RULES`, `MANUAL_OVERRIDES`, `mapRuleToRiskCategory` (dead after category lookup).
  - Add `CATEGORY_STRING_TO_ID: Record<string, RiskCategoryId>` mapping the 9 backend strings to existing ids:
    ```
    "Management risk" → "management"
    "Collateral risk / asset quality" → "collateral"
    "Market / Industry news / Bursa announcements" → "market"
    "Cashflow / Capacity risk / Cash conversion cycle" → "cashflow"
    "Operational / Project risk" → "operational"
    "Fraud risk" → "fraud"
    "Related party transaction / Fund leakage / Dividend Paid" → "related_party"
    "Financial analysis" → "financial"
    "Areas for probe (others)" → "probe"
    ```
  - Keep `RiskCategoryId`, `RISK_CATEGORIES` (id/label/icon only), `RISK_CATEGORY_MAP`, `RuleStatus`, `RESULT_CONFIG`.
- `lib/risk-score.ts`: **delete file** (sole consumer of weights; not imported anywhere).
- Verify nothing else imports `.weight`.

## Phase 3 — Fly.io proxy `loan-review-proxy-v2`

Copy `/home/kenan/work/worktrees/update-api-zi3/proxy/` as a new top-level folder `proxy/` in this repo.

Changes vs. v1 proxy:
- `fly.toml`: `app = 'loan-review-proxy-v2'` (same region `sin`, same 256 mb, same healthcheck).
- `src/server.ts`:
  - `EXTERNAL_API_URL` default → `https://dev-genie.001.gs/smart-api/reviewer_v2`
  - Route → `POST /api/loan-review-v2` (rename from `/api/loan-review`).
  - Keep `multer upload.single("ca")`, `tee()` logging, `pruneOldDumps`, `AbortController` on client disconnect.
- `package.json`: rename `name` to `loan-review-proxy-v2`.
- Deploy: `flyctl launch --copy-config --no-deploy` then `flyctl deploy`. Record resulting URL (expected `https://loan-review-proxy-v2.fly.dev`).

## Phase 4 — Client SSE consumer (store rewrite)

Replace `store/loan-review.ts` body of `submit()`:
- Read `NEXT_PUBLIC_PROXY_URL_V2`. Retry wrapper (3 attempts, `2000 * (attempt+1)` ms backoff) mirroring v1 (`/home/kenan/work/worktrees/update-api-zi3/store/loan-review.ts:86-96`).
- `POST ${PROXY_BASE}/api/loan-review-v2` with `FormData{ca: file}`.
- Read stream via `reader.read()`, split on `\n\n`, handle `: heartbeat`, `retry:`, and `data: ` lines (pattern from v1 store lines 105-169).
- For each parsed event:
  - If `event.status === "completed"` or `nodeID === "end"` → destructure `event.output` as `{ca, result, summary, decision}`, filter N/A rules from `result`, build final `SimulationResult` (see Phase 5 transformer), set `step: 3, isSubmitting: false, processingProgress: 100`.
  - Else track stage from `event.output.status` (strings exactly as emitted). Store `processingStage: "processing the document" | "extracting" | "checking" | "completed"` and `processingIndex` from `output.index`.
- Add new store field: `processingStage: string | null` (index not surfaced — UI shows labels only).
- Remove `SIMULATION_DELAY_MS`, `setInterval`, mock-loading path.
- Delete import of `loadSimulationData`.

## Phase 5 — Transformer + UI adaptation

`lib/simulate-review.ts` → rename to `lib/build-review-result.ts` (or keep filename — internal decision):
- `transformToReviewResult(ca, result, summary, decision)` signature stays.
- **Filter N/A rules**: `result.filter(r => r.result !== "N/A")` at the top.
- Drop `category_5c` usage — use `rule.risk_category` string for category grouping via `CATEGORY_STRING_TO_ID`.
- Replace `calculateRiskScore` with: `riskScore = summary.total_rules_evaluated > 0 ? Math.round((summary.total_pass / summary.total_rules_evaluated) * 100) : 0`.
- Add `riskBand = deriveRiskBand(riskScore)` (new helper in `lib/risk-band.ts`); attach to `SimulationResult`.
- Coerce `decision.required_conditions = decision.required_conditions ?? []` before passing through — UI downstream sees `string[]`.
- Keep `determineStatus`, `generateSummary` (they already work on counts).

UI surgery:
- `components/results/risk-panel.tsx`
  - Line 31: `rules.filter((r) => r.risk_category === cat.id)` → must use `CATEGORY_STRING_TO_ID` to map verbose strings to IDs for comparison.
  - **Remove the empty-category guard**: delete `if (catRules.length === 0) return null`. Show all 9 categories always.
  - Remove N/A from `STATUS_OPTIONS` filter chips array.
- `components/results/risk-category-section.tsx`
  - Line 20: key composition drops `category_5c`; use `rule.risk_category`.
  - Remove `"N/A"` from `RULE_STATUS_ORDER`.
  - `countsLabel` drops the U(unverifiable) count display for N/A (since they're filtered out).
- `components/results/risk-item.tsx`
  - **Remove the secondary chip entirely** (lines 25-39 area showing `category_5c`). No replacement.
  - Add new expandable sections below existing ACTION block (match the ACTION uppercase-label-+-panel style), only rendered when non-empty:
    - `REQUIRED FIELDS` (`rule.required_fields`) — bullet list.
    - `SOURCE EVIDENCE` (`rule.source_evidence` array) — bullet list.
    - `SOURCE FILE` (`rule.source_file`) — one-liner; hide when null.
  - Keep existing `EXPLANATION` and `ACTION` blocks as-is.
- `components/results/result-sidebar.tsx`
  - Lines 68-70: drop `byRiskCategory`; read `riskScore` and `riskBand` from the `SimulationResult` (both client-derived by the transformer).
  - Lines 103, 159-ish `RISK_CATEGORIES.map`: replace per-category `by_risk_category[cat.id]` lookups with summary.by_category values mapped via `CATEGORY_STRING_TO_ID`.
  - `RiskMeter` — still receives `value` (score) and `band` from `SimulationResult`. **Invert `TRACK_DATA`** in `components/results/risk-meter.tsx:21-25` so the gauge visually matches score-as-pass-rate: `[{name:"high",value:40,color:"red-400"}, {name:"medium",value:30,color:"amber-300"}, {name:"low",value:30,color:"emerald-400"}]` — i.e. red on the left, emerald on the right.
- `components/results/layout-briefing.tsx` + `layout-ledger.tsx`
  - Drop `risk_score`, `by_risk_category` reads. Replace with `summary.by_category` values + `result.riskScore` / `result.riskBand`.
  - `getRiskBandStyle(evaluationSummary.risk_band, c)` → `getRiskBandStyle(result.riskBand, c)` (both files); the switch on `"low"|"medium"|"high"` stays as-is.
  - Keep `aiSummary` prop chain; `components/results-step.tsx:27` now builds `riskSummaries = Object.fromEntries(RISK_CATEGORIES.map(c => [c.id, "No AI summary available yet."]))`.
  - Don't add `decision.reasoning` to briefing/ledger headers — sidebar-only.
- `components/results-step.tsx` line 27: drop `riskSummaries = evaluationSummary.risk_summaries ?? {}`.
- `components/processing-step.tsx`: replace time-based `processingProgress` bar with a 4-step stepper driven by `useLoanReviewStore.processingStage`: "Processing document" → "Extracting" → "Checking" → "Completed". Mark earlier stages done when a later one arrives. **No index counter, no inferred progress bar** — stage labels only.
- `app/admin/page.tsx` — **no change**. Admin page uploads to `/api/risk-learning` (separate rule-extraction service, not `reviewer_v2`). Its `category_5c` chip reflects that backend's schema and is unrelated to this migration.

## Phase 6 — Next.js cleanup & env

- **Delete** `app/api/loan-review/route.ts`, `app/api/loan-review/status/route.ts`, `lib/job-store.ts`, `lib/parse-response.ts` — polling pattern no longer used.
- **Delete** `app/data/ca_extracted_rh_group.json`, `app/data/evaluation_report_rh_group.json`, `lib/simulate-review.ts` mock loader path.
- `app/page.tsx` lines 15-17, 63-85: remove `DEBUG_SKIP_PROCESSING` branch and its mock-loading code.
- Add `.env.example` at repo root: `NEXT_PUBLIC_PROXY_URL_V2=https://loan-review-proxy-v2.fly.dev`.
- In Vercel dashboard: set `NEXT_PUBLIC_PROXY_URL_V2` for the v2 project (separate from the v1 project's `NEXT_PUBLIC_PROXY_URL`).

## Phase 7 — Verification

1. `pnpm typecheck && pnpm lint` — clean.
2. Fly deploy: `cd proxy && flyctl deploy`. `curl https://loan-review-proxy-v2.fly.dev/healthz` → `ok`.
3. End-to-end: `pnpm dev`, open app, upload a CA PDF, verify:
   - Processing view shows stages in order using literal `output.status` strings.
   - Terminal event produces results view with: counts in sidebar/briefing/ledger, RiskMeter showing client-computed %, decision.recommendation/key_concerns/key_strengths rendered, CA data panel renders all present sections (no crash on missing `D_`).
4. SSE parser resilience: simulate heartbeat (`: heartbeat`), mid-event disconnect, malformed JSON — should not crash the store.
5. Confirm v1 worktree still deploys independently (no cross-worktree import regressions).

---

## Critical files

- Read/modify: `types/review.ts`, `lib/risk-framework.ts`, `lib/risk-score.ts` (delete), `lib/simulate-review.ts`, `store/loan-review.ts`, `app/page.tsx`, `components/results/*.tsx`, `components/processing-step.tsx`, `components/results-step.tsx`.
- **Not touched**: `app/admin/page.tsx` (separate `/api/risk-learning` backend — orthogonal to reviewer migration).
- Copy pattern from: `/home/kenan/work/worktrees/update-api-zi3/proxy/` (all files), `/home/kenan/work/worktrees/update-api-zi3/store/loan-review.ts:84-169` (SSE parser), `/home/kenan/work/worktrees/update-api-zi3/lib/simulate-review.ts` (transformer).
- Delete: `app/api/loan-review/route.ts`, `app/api/loan-review/status/route.ts`, `lib/job-store.ts`, `lib/parse-response.ts`, `app/data/ca_extracted_rh_group.json`, `app/data/evaluation_report_rh_group.json`, `lib/risk-score.ts`.
- New: `proxy/` subtree, `types/sse.ts`, `lib/risk-band.ts`, `.env.example`.

## Assumptions

- Vercel project for v2 is already separate from v1 (or will be). If v1 and v2 share one Vercel project we need a different scheme (e.g., path-based).
- `CATEGORY_STRING_TO_ID` covers all 9 strings the backend ever emits. Unknown strings fall back to `probe` (defensive default).
- Same Fly org / account has capacity for a second `shared-cpu-1x` machine.
- Backend multipart field name is `ca` (matches v1 proxy). If v2 backend expects a different field name, the proxy's `upload.single("ca")` + `upstream.append("ca", …)` must change — verify on first deploy with curl.
- Band thresholds for unweighted riskScore (≥70/40-69/<40) are a reasonable first cut; tweak after real-world testing.
- `source_file` may have values in future backend versions even though it's always null in the current sample — render conditionally.

## Resolved decisions

- Data source for counts → use backend `summary` as authoritative (not rule array counts).
- N/A rules → remove entirely from display and calculation. Remove N/A filter chip.
- Progress display → stage labels only (4-step stepper, no counter).
- `decision.reasoning` → sidebar only; briefing/ledger don't add a new summary block.
- Per-category AI summary → keep prop chain, feed placeholder text for all 9 categories.
- Rule FAIL/WARN/UNVERIFIABLE/PASS → driven by `rule.result` via `RESULT_CONFIG` (no change).
- Secondary chip → remove entirely (no replacement).
- New fields in rule item → show `required_fields`, `source_evidence`, `source_file` (when non-empty). Don't show `validation_logic`.
- Gauge + band → **invert gauge track zones** to `0–40 red / 40–70 amber / 70–100 emerald`; band thresholds `≥70 low / 40–69 medium / <40 high`.
- Empty categories → show all 9 always, even with 0 rules.
- `decision.required_conditions` → transformer coerces `null` → `[]`. Type stays `string[]`.
- CA data → make ALL `CaData` fields optional (`?`). Every CA application is different; any section may be absent. Guard all reads.
- Admin page → no change (separate `/api/risk-learning` backend, out of scope).
- Stream resilience → match v1, no watchdog. Wait indefinitely; user reloads if stuck.
- Unknown `risk_category` strings → fall back to `probe` silently with `console.warn`.
- Vercel env → `NEXT_PUBLIC_PROXY_URL_V2` set on all environments (production + preview + development) with the same Fly URL.
- Dead code → delete `lib/risk-score.ts`, remove `weight`/`KEYWORD_RULES`/`MANUAL_OVERRIDES`/`mapRuleToRiskCategory` from `lib/risk-framework.ts`.
