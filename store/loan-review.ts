import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type ResultLayout = "sidebar" | "briefing" | "ledger"

interface LoanReviewState {
  step: 1 | 2 | 3
  applicationFile: File | null
  taskId: string | null
  viewingId: number | null
  resultLayout: ResultLayout

  setStep: (step: 1 | 2 | 3) => void
  setApplicationFile: (file: File | null) => void
  setTaskId: (taskId: string | null) => void
  setViewingId: (id: number | null) => void
  setResultLayout: (layout: ResultLayout) => void
  reset: () => void
}

export interface PersistedLoanReview {
  taskId: string | null
}

/**
 * What survives a reload. We persist a taskId ONLY while a review is still
 * in-flight (step 2), so an accidental refresh mid-run resumes polling. Once a
 * review completes (step 3) the taskId is dropped, so reloading or visiting "/"
 * lands on Upload instead of resurfacing the previous result. A viewed history
 * item is never persisted — it is reached via the `?id=` URL, which survives a
 * reload on its own.
 */
export function persistedReviewState(
  s: Pick<LoanReviewState, "step" | "taskId">
): PersistedLoanReview {
  return { taskId: s.step === 2 ? s.taskId : null }
}

export const useLoanReviewStore = create<LoanReviewState>()(
  persist(
    (set) => ({
      step: 1,
      applicationFile: null,
      taskId: null,
      viewingId: null,
      resultLayout: "sidebar",

      setStep: (step) => set({ step }),
      setApplicationFile: (applicationFile) => set({ applicationFile }),
      setTaskId: (taskId) => set({ taskId }),
      setViewingId: (viewingId) => set({ viewingId }),
      setResultLayout: (resultLayout) => set({ resultLayout }),
      reset: () =>
        set({
          step: 1,
          applicationFile: null,
          taskId: null,
          viewingId: null,
        }),
    }),
    {
      name: "loan-review",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => persistedReviewState(s),
    }
  )
)
