import { create } from "zustand"
import type { ReviewResult } from "@/types/review"
import { parseResponse } from "@/lib/parse-response"

const POLL_INTERVAL_MS = 10_000
const MAX_POLL_MS = 30 * 60 * 1000

interface LoanReviewState {
  step: 1 | 2 | 3 | 4
  applicationFile: File | null
  exampleFiles: File[]
  jobId: string | null
  result: ReviewResult | null
  error: string | null
  isSubmitting: boolean

  setStep: (step: 1 | 2 | 3 | 4) => void
  setApplicationFile: (file: File | null) => void
  setExampleFiles: (files: File[]) => void
  submit: () => Promise<void>
  reset: () => void
  resumeJob: (jobId: string) => void
}

export const useLoanReviewStore = create<LoanReviewState>((set, get) => ({
  step: 1,
  applicationFile: null,
  exampleFiles: [],
  jobId: null,
  result: null,
  error: null,
  isSubmitting: false,

  setStep: (step) => set({ step }),

  setApplicationFile: (file) => set({ applicationFile: file }),

  setExampleFiles: (files) => set({ exampleFiles: files }),

  submit: async () => {
    const { applicationFile, exampleFiles, jobId, isSubmitting } = get()

    if (jobId || isSubmitting) return
    if (!applicationFile) return

    set({ isSubmitting: true, error: null })

    try {
      const formData = new FormData()
      formData.append("application", applicationFile)
      for (const file of exampleFiles) {
        formData.append("examples", file)
      }

      const res = await fetch("/api/loan-review", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }))
        set({ isSubmitting: false, error: data.error ?? "Submission failed" })
        return
      }

      const { jobId: newJobId } = await res.json()

      set({ jobId: newJobId, step: 3, isSubmitting: false })

      // Start polling
      pollUntilComplete(newJobId, set, get)
    } catch (err) {
      set({
        isSubmitting: false,
        error: `Submission failed: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  },

  reset: () => {
    set({
      step: 1,
      applicationFile: null,
      exampleFiles: [],
      jobId: null,
      result: null,
      error: null,
      isSubmitting: false,
    })
  },

  resumeJob: (jobId) => {
    set({ jobId, step: 3, isSubmitting: false })
    pollUntilComplete(jobId, set, get)
  },
}))

function pollUntilComplete(
  jobId: string,
  set: (partial: Partial<LoanReviewState>) => void,
  get: () => LoanReviewState
) {
  const startTime = Date.now()
  let consecutiveFailures = 0

  const interval = setInterval(async () => {
    const state = get()

    // Stop if job was reset
    if (state.jobId !== jobId) {
      clearInterval(interval)
      return
    }

    // Timeout check
    if (Date.now() - startTime > MAX_POLL_MS) {
      clearInterval(interval)
      set({
        error: "Review timed out after 30 minutes. Please try again.",
        step: 3,
      })
      return
    }

    try {
      const res = await fetch(`/api/loan-review/status?jobId=${jobId}`)

      if (!res.ok) {
        consecutiveFailures++
        if (consecutiveFailures >= 3) {
          clearInterval(interval)
          set({ error: "Lost connection to server. Please try again." })
        }
        return
      }

      consecutiveFailures = 0
      const data = await res.json()

      if (data.status === "complete") {
        clearInterval(interval)
        set({ result: parseResponse(data.result), step: 4 })
      } else if (data.status === "error") {
        clearInterval(interval)
        set({
          error: data.error ?? "Review failed. Please try again.",
          step: 3,
        })
      }
    } catch {
      consecutiveFailures++
      if (consecutiveFailures >= 3) {
        clearInterval(interval)
        set({
          error: "Network error. Please check your connection and try again.",
        })
      }
    }
  }, POLL_INTERVAL_MS)
}
