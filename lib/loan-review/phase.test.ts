import { describe, it, expect } from "vitest"
import { adaptOutput, derivePhase } from "./phase"
import type { NodeInfo } from "./api"

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
