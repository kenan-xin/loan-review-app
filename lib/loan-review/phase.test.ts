import { describe, it, expect } from "vitest"
import {
  adaptOutput,
  derivePhase,
  deriveProgress,
  describePhase,
  dedupeNewestByFilename,
} from "./phase"
import type { ReviewProgress } from "./phase"
import type { NodeInfo, ResultStatus } from "./api"
import snapshotA from "./__fixtures__/reviewer-status-mid-extract-1.json"
import snapshotB from "./__fixtures__/reviewer-status-mid-extract-2.json"

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

function progress(
  extract: Partial<ReviewProgress["extract"]>,
  rules: Partial<ReviewProgress["rules"]> = {}
): ReviewProgress {
  return {
    extract: { done: 0, inProgress: 0, seen: 0, ...extract },
    rules: { done: 0, inProgress: 0, seen: 0, ...rules },
  }
}

describe("describePhase", () => {
  it("shows the current extraction batch's page range (3 pages/chunk)", () => {
    // 2 chunks done → current batch is pages 7..9, regardless of in-flight count.
    const label = describePhase("extracting", progress({ done: 2, inProgress: 5 }))
    expect(label).toBe("Extracting CA — pages 7-9")
  })

  it("shows the current checklist batch's rule range (5 rules/chunk)", () => {
    // 3 chunks done → current batch is rules 16..20, regardless of in-flight count.
    const label = describePhase("checking", progress({}, { done: 3, inProgress: 2 }))
    expect(label).toBe("Evaluating rules — rules 16-20")
  })

  it("says 'almost done' once a loop has drained its last in-flight batch", () => {
    expect(describePhase("extracting", progress({ done: 43, inProgress: 0 }))).toBe(
      "Extracting CA — almost done"
    )
    expect(describePhase("checking", progress({}, { done: 19, inProgress: 0 }))).toBe(
      "Evaluating rules — almost done"
    )
  })

  it("shows the bare stage label before a loop has produced any work", () => {
    expect(describePhase("extracting", progress({ done: 0, inProgress: 0 }))).toBe(
      "Extracting CA"
    )
  })

  it("falls back to the plain stage label for non-loop phases", () => {
    expect(describePhase("reading", null)).toBe("Reading document")
    expect(describePhase("finalising", null)).toBe("Finalising review")
    expect(describePhase("processing", null)).toBe("Processing")
  })
})

// Two real reviewer_v2/status/:id payloads captured ~15s apart from a single
// live review, mid-extraction (~5 chunks always in flight). The verbose `logs`
// were trimmed; the node graph (ids + statuses) the derivations read is
// verbatim. These lock the single-batch page window against real API output:
// the old `done + inProgress` span rendered "pages 52-66" here, which must not
// regress.
describe("describePhase with real reviewer_v2 snapshots", () => {
  const nodesA = snapshotA.nodeInfos as NodeInfo[]
  const nodesB = snapshotB.nodeInfos as NodeInfo[]

  it("renders a single 3-page batch while extraction runs (17 done, 5 in flight)", () => {
    expect(derivePhase(nodesA, snapshotA.status)).toBe("extracting")
    expect(deriveProgress(nodesA).extract).toEqual({ done: 17, inProgress: 5, seen: 22 })
    expect(describePhase("extracting", deriveProgress(nodesA))).toBe(
      "Extracting CA — pages 52-54"
    )
  })

  it("advances the window one batch forward on the next poll (20 done)", () => {
    expect(deriveProgress(nodesB).extract).toEqual({ done: 20, inProgress: 5, seen: 25 })
    expect(describePhase("extracting", deriveProgress(nodesB))).toBe(
      "Extracting CA — pages 61-63"
    )
  })
})

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
