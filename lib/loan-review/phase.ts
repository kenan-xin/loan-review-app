import type { KV, NodeInfo, ResultStatus } from "./api"

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

// The extraction loop processes the document 3 pages per chunk; the checklist
// loop processes 5 rules per chunk (the last chunk of each may be smaller).
const EXTRACT_PAGES_PER_CHUNK = 3
const RULES_PER_CHUNK = 5

const PHASE_LABEL: Record<ReviewPhase, string> = {
  processing: "Processing",
  reading: "Reading document",
  extracting: "Extracting CA data",
  checking: "Evaluating rules",
  finalising: "Finalising review",
  completed: "Completed",
}

/**
 * Human label for the work currently in flight within a loop.
 *
 * The status API never reports the total chunk count (chunks are created
 * incrementally as the iterator runs), so we can't know which batch is the
 * literal last one. Instead we show the page/rule range of the current batch,
 * anchored on the number completed so it ticks forward one batch at a time, and
 * fall back to "almost done" once the loop has drained its last in-flight batch
 * — i.e. work has been done but nothing is currently running, which in practice
 * only happens as the loop wraps up.
 */
function loopSuffix(loop: LoopProgress, unit: string, perChunk: number): string {
  if (loop.done === 0 && loop.inProgress === 0) return ""
  if (loop.inProgress === 0) return " — almost done"
  const start = perChunk * loop.done + 1
  const end = perChunk * (loop.done + 1)
  return ` — ${unit} ${start}-${end}`
}

/** Active-stage label shown while a review is processing. */
export function describePhase(
  phase: ReviewPhase,
  progress: ReviewProgress | null
): string {
  if (phase === "extracting" && progress) {
    return (
      PHASE_LABEL.extracting +
      loopSuffix(progress.extract, "pages", EXTRACT_PAGES_PER_CHUNK)
    )
  }
  if (phase === "checking" && progress) {
    return (
      PHASE_LABEL.checking + loopSuffix(progress.rules, "rules", RULES_PER_CHUNK)
    )
  }
  return PHASE_LABEL[phase]
}

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
