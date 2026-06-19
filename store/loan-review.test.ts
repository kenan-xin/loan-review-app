import { describe, it, expect } from "vitest"
import { persistedReviewState } from "./loan-review"

describe("persistedReviewState", () => {
  it("persists the taskId while a review is in-flight (step 2)", () => {
    expect(persistedReviewState({ step: 2, taskId: "task-123" })).toEqual({
      taskId: "task-123",
    })
  })

  it("drops the taskId once a review completes (step 3)", () => {
    // The bug: a completed review used to be persisted, so reloading "/"
    // re-polled the finished task and resurfaced the old result page.
    expect(persistedReviewState({ step: 3, taskId: "task-123" })).toEqual({
      taskId: null,
    })
  })

  it("persists nothing on the upload step (step 1)", () => {
    expect(persistedReviewState({ step: 1, taskId: "task-123" })).toEqual({
      taskId: null,
    })
  })

  it("persists no taskId when none exists mid-run", () => {
    expect(persistedReviewState({ step: 2, taskId: null })).toEqual({
      taskId: null,
    })
  })
})
