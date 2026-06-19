import { create } from "zustand"
import { persist } from "zustand/middleware"

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
      // Only persist what is needed to resume a mid-run review across refresh.
      partialize: (s) => ({ taskId: s.taskId, viewingId: s.viewingId }),
    }
  )
)
