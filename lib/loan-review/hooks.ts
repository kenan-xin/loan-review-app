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
const HARD_TIMEOUT_MS = 20 * 60 * 1000

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
    refetchInterval: (q) => {
      const d = q.state.data
      if (isTerminal(d?.status)) return false
      const started = d?.startedAt ? Date.parse(d.startedAt) : q.state.dataUpdatedAt
      if (started && Date.now() - started > HARD_TIMEOUT_MS) return false
      return 3000
    },
  })

  const data = query.data
  const nodeInfos = data?.nodeInfos ?? []

  const started = data?.startedAt ? Date.parse(data.startedAt) : query.dataUpdatedAt
  const timedOut =
    data?.status === "running" &&
    !!started &&
    !Number.isNaN(started) &&
    Date.now() - started > HARD_TIMEOUT_MS

  const phase: ReviewPhase = data ? derivePhase(nodeInfos, data.status) : "processing"
  const progress = data ? deriveProgress(nodeInfos) : null
  const result =
    data?.status === "success" && data.output ? buildResult(data.output) : null
  const taskError =
    data?.status === "failed"
      ? data.errorMessage ||
        nodeInfos.find((n) => n.status === "failed")?.error ||
        "Review failed"
      : timedOut
        ? "Review timed out after 20 minutes — please retry."
        : null

  return {
    phase,
    progress,
    result,
    taskError,
    isTerminal: isTerminal(data?.status) || timedOut,
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
