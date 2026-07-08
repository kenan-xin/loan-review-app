"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
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

// Poll cadences. A full review runs ~20 min, so we poll gently to keep load on
// the public dev-genie backend low while still surfacing per-chunk progress.
const STATUS_POLL_MS = 15000
// The history list never stops polling: a brand-new row (status "initial")
// can appear at any time, so we keep checking even when every known row is
// already "done". Poll faster while something is in progress, slower when idle.
const HISTORY_ACTIVE_POLL_MS = 5000
const HISTORY_IDLE_POLL_MS = 10000

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
  // No client-side timeout: a review can legitimately make no per-chunk
  // progress for long stretches (document reading before the first chunk, a
  // single slow chunk, or the finalising step while llm_3 synthesises the
  // result). Polling runs until the backend reports a terminal status.
  const query = useQuery({
    queryKey: ["taskStatus", taskId],
    queryFn: () => getTaskStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (q) =>
      isTerminal(q.state.data?.status) ? false : STATUS_POLL_MS,
    // A review runs ~20 min. Keep polling while the tab is hidden so progress
    // and the terminal result land even if the user switches away — the
    // history list is left to pause (it polls forever by default).
    refetchIntervalInBackground: true,
  })

  const data = query.data
  const nodeInfos = data?.nodeInfos ?? []

  const phase: ReviewPhase = data
    ? derivePhase(nodeInfos, data.status)
    : "processing"
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
    // ReviewHistory only mounts on step 1, so it unmounts for the ~20 min a
    // review runs. Keep the cache alive across unmount (gcTime: Infinity) and
    // keep showing the last rows during refetches (placeholderData) so the
    // list silently background-updates instead of flashing a loading spinner
    // every time the user returns to step 1.
    gcTime: Infinity,
    placeholderData: keepPreviousData,
    // Never returns false — keep polling so newly-created rows are picked up.
    refetchInterval: (q) => {
      const rows = q.state.data
      return rows && !hasNonTerminalStatus(rows)
        ? HISTORY_IDLE_POLL_MS
        : HISTORY_ACTIVE_POLL_MS
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
