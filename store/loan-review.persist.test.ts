import { describe, it, expect, beforeEach } from "vitest"

// jsdom is not configured, so polyfill a minimal synchronous web storage and
// expose it as the `sessionStorage` global BEFORE importing the store. The
// store no longer persists anything; this guards against someone wiring the
// `persist` middleware back in.
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

describe("loan-review store does not persist (sessionStorage)", () => {
  beforeEach(() => {
    store.clear()
    useLoanReviewStore.getState().reset()
  })

  it("writes nothing to sessionStorage while a review is in-flight", () => {
    const { setTaskId, setStep } = useLoanReviewStore.getState()
    setTaskId("task-abc")
    setStep(2)
    // Nothing is persisted, so a mid-run refresh reads back nothing and lands
    // on Upload instead of resuming the in-flight review.
    expect(store.getItem("loan-review")).toBeNull()
    // The current session still holds the taskId in memory and keeps polling.
    expect(useLoanReviewStore.getState().taskId).toBe("task-abc")
  })
})
