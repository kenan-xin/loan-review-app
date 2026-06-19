import type { KV, NodeInfo } from "./api"

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
