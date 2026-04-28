import { create } from "zustand"
import type { SimulationResult, ReviewHistoryItem } from "@/types/review"
import { transformToReviewResult } from "@/lib/simulate-review"

export type SseStage =
  | "idle"
  | "processing_document"
  | "extracting"
  | "checking"
  | "completed"

const NODE_TO_STAGE: Record<string, SseStage> = {
  response_3: "processing_document",
  response_1: "extracting",
  response_2: "checking",
}

const STAGE_INDEX: Record<SseStage, number> = {
  idle: -1,
  processing_document: 0,
  extracting: 1,
  checking: 2,
  completed: 3,
}

type ResultLayout = "sidebar" | "briefing" | "ledger"

let abortController: AbortController | null = null

interface LoanReviewState {
  step: 1 | 2 | 3
  applicationFile: File | null
  result: SimulationResult | null
  error: string | null
  isSubmitting: boolean
  stage: SseStage
  resultLayout: ResultLayout
  reviewHistory: ReviewHistoryItem[]
  isLoadingHistory: boolean
  historyError: string | null

  setStep: (step: 1 | 2 | 3) => void
  setApplicationFile: (file: File | null) => void
  submit: () => void
  reset: () => void
  setResultLayout: (layout: ResultLayout) => void
  fetchReviewHistory: () => Promise<void>
  viewHistoryItem: (item: ReviewHistoryItem) => void
  loadHistoryById: (id: number) => Promise<void>
}

export const useLoanReviewStore = create<LoanReviewState>((set, get) => ({
  step: 1,
  applicationFile: null,
  result: null,
  error: null,
  isSubmitting: false,
  stage: "idle",
  resultLayout: "sidebar",
  reviewHistory: [],
  isLoadingHistory: false,
  historyError: null,

  setStep: (step) => set({ step }),

  setApplicationFile: (file) => set({ applicationFile: file }),

  setResultLayout: (layout) => set({ resultLayout: layout }),

  fetchReviewHistory: async () => {
    const { reviewHistory } = get()
    if (reviewHistory.length > 0) return

    set({ isLoadingHistory: true, historyError: null })
    try {
      const response = await fetch("https://dev-genie.001.gs/smart-api/hl_retriever")
      if (!response.ok) throw new Error(`Server error: ${response.status}`)
      const data = await response.json()
      const items: ReviewHistoryItem[] = JSON.parse(data.result)
      const completed = items.filter(
        (item) => {
          try {
            const parsed = JSON.parse(item.result)
            return Array.isArray(parsed) && parsed.length > 0
          } catch {
            return false
          }
        }
      )
      const sorted = completed.sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      )
      const byFilename = new Map<string, ReviewHistoryItem>()
      for (const item of sorted) {
        if (!byFilename.has(item.filename)) byFilename.set(item.filename, item)
      }
      set({ reviewHistory: Array.from(byFilename.values()), isLoadingHistory: false })
    } catch (err) {
      set({
        historyError: String((err as Error).message ?? err),
        isLoadingHistory: false,
      })
    }
  },

  viewHistoryItem: (item: ReviewHistoryItem) => {
    const ca = JSON.parse(item.ca)
    const result = JSON.parse(item.result)
    const summary = JSON.parse(item.summary)
    const decision = JSON.parse(item.decision)

    const reviewResult = transformToReviewResult(
      ca as SimulationResult["caData"],
      result as SimulationResult["evaluationResults"],
      summary as SimulationResult["evaluationSummary"],
      decision as SimulationResult["evaluationDecision"]
    )

    set({
      result: reviewResult,
      step: 3,
      isSubmitting: false,
      stage: "completed",
    })
  },

  loadHistoryById: async (id: number) => {
    const { reviewHistory, fetchReviewHistory, viewHistoryItem } = get()
    set({ isLoadingHistory: true, historyError: null })

    if (reviewHistory.length === 0) {
      await fetchReviewHistory()
    }

    const item = get().reviewHistory.find((h) => h.id === id)
    if (!item) {
      set({ historyError: "Review not found", isLoadingHistory: false })
      return
    }

    viewHistoryItem(item)
    set({ isLoadingHistory: false })
  },

  submit: () => {
    const { applicationFile, isSubmitting } = get()
    if (isSubmitting || !applicationFile) return

    abortController = new AbortController()
    const { signal } = abortController

    set({
      isSubmitting: true,
      error: null,
      step: 2,
      stage: "idle",
    })

    const formData = new FormData()
    formData.append("ca", applicationFile)

    let buffer = ""

    const PROXY_BASE = process.env.NEXT_PUBLIC_PROXY_URL_V2 ?? ""
    if (!PROXY_BASE) {
      set({ error: "Proxy URL not configured (NEXT_PUBLIC_PROXY_URL_V2)", isSubmitting: false })
      return
    }
    const MAX_RETRIES = 3
    const doFetch = async (attempt = 0): Promise<Response> => {
      try {
        return await fetch(`${PROXY_BASE}/api/loan-review-v2`, {
          method: "POST",
          body: formData,
          signal,
        })
      } catch (err) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
          return doFetch(attempt + 1)
        }
        throw err
      }
    }

    doFetch()
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.text().catch(() => "")
          throw new Error(`Server error: ${response.status} ${body}`)
        }
        if (!response.body) throw new Error("No response body")

        const rdr = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await rdr.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split("\n\n")
          buffer = frames.pop() ?? ""

          for (const frame of frames) {
            const lines = frame.split("\n")
            for (const line of lines) {
              if (line.startsWith(":")) continue
              if (line.startsWith("retry:")) continue
              if (!line.startsWith("data: ")) continue

              const jsonStr = line.slice(6)
              let event: Record<string, unknown>
              try {
                event = JSON.parse(jsonStr)
              } catch {
                console.warn("[SSE] bad frame", jsonStr.slice(0, 200))
                continue
              }

              const nodeID = event.nodeID as string | undefined

              if (event.eventType === "error" && event.errorMessage && !get().error) {
                const msg = event.errorMessage as string
                console.error("[SSE] backend error:", msg)
                set({ error: msg.includes("openrouter") ? "AI provider error — please retry" : msg, isSubmitting: false })
              }

              if (nodeID && NODE_TO_STAGE[nodeID]) {
                const newStage = NODE_TO_STAGE[nodeID]
                const currentStage = get().stage
                if (STAGE_INDEX[newStage] > STAGE_INDEX[currentStage]) {
                  console.debug("[SSE] stage →", newStage, { from: currentStage, nodeID })
                  set({ stage: newStage })
                }
              }

              if (nodeID === "end" || event.status === "completed") {
                const output = event.output as {
                  ca: unknown
                  result: unknown
                  summary: unknown
                  decision: unknown
                }

                if (output) {
                  const result = transformToReviewResult(
                    output.ca as SimulationResult["caData"],
                    output.result as SimulationResult["evaluationResults"],
                    output.summary as SimulationResult["evaluationSummary"],
                    output.decision as SimulationResult["evaluationDecision"]
                  )

                  set({
                    result,
                    step: 3,
                    isSubmitting: false,
                    stage: "completed",
                  })
                }
              }
            }
          }
        }

        // Stream ended without terminal event
        if (get().stage !== "completed") {
          set({ error: "Stream ended without results", isSubmitting: false })
        }
      })
      .catch((err) => {
        if (signal.aborted) return
        console.error("SSE stream error:", err)
        set({ error: String(err.message ?? err), isSubmitting: false })
      })
  },

  reset: () => {
    abortController?.abort()
    abortController = null
    set({
      step: 1,
      applicationFile: null,
      result: null,
      error: null,
      isSubmitting: false,
      stage: "idle",
      resultLayout: "sidebar",
      reviewHistory: [],
      isLoadingHistory: false,
      historyError: null,
    })
  },
}))
