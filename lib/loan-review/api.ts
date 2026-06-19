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
