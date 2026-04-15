import { create } from "zustand"
import type { SimulationResult } from "@/types/review"
import {
  loadSimulationData,
  transformToReviewResult,
} from "@/lib/simulate-review"

const SIMULATION_DELAY_MS = 120_000

interface LoanReviewState {
  step: 1 | 2 | 3
  applicationFile: File | null
  jobId: string | null
  result: SimulationResult | null
  error: string | null
  isSubmitting: boolean
  processingProgress: number
  resultLayout: "sidebar" | "briefing" | "ledger"

  setStep: (step: 1 | 2 | 3) => void
  setApplicationFile: (file: File | null) => void
  submit: () => void
  reset: () => void
  resumeJob: (jobId: string) => void
  setResultLayout: (layout: "sidebar" | "briefing" | "ledger") => void
}

export const useLoanReviewStore = create<LoanReviewState>((set, get) => ({
  step: 1,
  applicationFile: null,
  jobId: null,
  result: null,
  error: null,
  isSubmitting: false,
  processingProgress: 0,
  resultLayout:
    typeof window !== "undefined"
      ? ((localStorage.getItem("result-layout") as
          | "sidebar"
          | "briefing"
          | "ledger") ?? "sidebar")
      : "sidebar",

  setStep: (step) => set({ step }),

  setApplicationFile: (file) => set({ applicationFile: file }),

  submit: () => {
    const { applicationFile, jobId, isSubmitting } = get()

    if (jobId || isSubmitting) return
    if (!applicationFile) return

    set({ isSubmitting: true, error: null, step: 2, processingProgress: 0 })

    const startTime = Date.now()
    const endTime = startTime + SIMULATION_DELAY_MS

    const progressInterval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const progress = Math.min(
        99,
        ((SIMULATION_DELAY_MS - remaining) / SIMULATION_DELAY_MS) * 100
      )
      set({ processingProgress: progress })
    }, 1000)

    setTimeout(() => {
      clearInterval(progressInterval)

      try {
        const {
          caData,
          evaluationResults,
          evaluationSummary,
          evaluationDecision,
        } = loadSimulationData()
        const result = transformToReviewResult(
          caData,
          evaluationResults,
          evaluationSummary,
          evaluationDecision
        )

        set({
          result,
          step: 3,
          isSubmitting: false,
          processingProgress: 100,
          jobId: `sim-${Date.now()}`,
        })
      } catch (err) {
        set({
          isSubmitting: false,
          error: `Simulation failed: ${err instanceof Error ? err.message : String(err)}`,
          processingProgress: 0,
        })
      }
    }, SIMULATION_DELAY_MS)
  },

  reset: () => {
    set({
      step: 1,
      applicationFile: null,
      jobId: null,
      result: null,
      error: null,
      isSubmitting: false,
      processingProgress: 0,
    })
  },

  resumeJob: (jobId) => {
    set({ jobId, step: 2, isSubmitting: false })
  },

  setResultLayout: (layout) =>
    set((state) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("result-layout", layout)
      }
      return { ...state, resultLayout: layout }
    }),
}))
