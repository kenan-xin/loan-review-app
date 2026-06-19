import { create } from "zustand"

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

/**
 * Nothing here survives a reload. A mid-run refresh drops to Upload while the
 * task keeps running server-side and resurfaces in history once it finishes;
 * shared/history items load via the `?id=` URL, which survives a reload on its
 * own.
 */
export const useLoanReviewStore = create<LoanReviewState>()((set) => ({
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
}))
