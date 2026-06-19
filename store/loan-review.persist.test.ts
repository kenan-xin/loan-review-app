import { describe, it, expect, beforeEach } from "vitest"

// jsdom is not configured, so polyfill a minimal synchronous web storage and
// expose it as the `sessionStorage` global BEFORE importing the store (the
// store reads `sessionStorage` at module load via createJSONStorage).
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
  }
}

const store = memoryStorage()
globalThis.sessionStorage = store

const { useLoanReviewStore } = await import("./loan-review")

function persisted(): { taskId: string | null } | null {
  const raw = store.getItem("loan-review")
  return raw ? JSON.parse(raw).state : null
}

describe("loan-review store persistence (sessionStorage)", () => {
  beforeEach(() => {
    store.clear()
    useLoanReviewStore.getState().reset()
  })

  it("persists the taskId to sessionStorage while a review is in-flight", () => {
    const { setTaskId, setStep } = useLoanReviewStore.getState()
    setTaskId("task-abc")
    setStep(2)
    expect(persisted()).toEqual({ taskId: "task-abc" })
  })

  it("drops the persisted taskId once the review completes (step 3)", () => {
    const { setTaskId, setStep } = useLoanReviewStore.getState()
    setTaskId("task-abc")
    setStep(2)
    setStep(3)
    // Reloading "/" reads this back: no taskId -> mount stays on Upload.
    expect(persisted()).toEqual({ taskId: null })
    // The in-memory taskId is untouched, so the current session keeps rendering
    // its result while polling the (now terminal) task.
    expect(useLoanReviewStore.getState().taskId).toBe("task-abc")
  })

  it("never persists viewingId (history items reload via the ?id= URL)", () => {
    const { setViewingId, setStep } = useLoanReviewStore.getState()
    setViewingId(7)
    setStep(3)
    expect(persisted()).toEqual({ taskId: null })
    expect(persisted()).not.toHaveProperty("viewingId")
  })
})
