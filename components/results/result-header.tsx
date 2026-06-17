"use client"

import { useRouter } from "next/navigation"
import { useLoanReviewStore } from "@/store/loan-review"

export function ResultHeader() {
  const router = useRouter()
  const reset = useLoanReviewStore((s) => s.reset)

  const handleNewReview = () => {
    reset()
    router.replace("/")
  }

  return (
    <div className="mb-3 flex shrink-0 items-center justify-between">
      <h2 className="text-base font-semibold">Review Results</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={handleNewReview}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Review
        </button>
        <a
          href="https://forms.cloud.microsoft/r/E56ubSr1wt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:bg-blue-700 hover:shadow-lg active:scale-95"
        >
          Share Feedback
        </a>
      </div>
    </div>
  )
}
