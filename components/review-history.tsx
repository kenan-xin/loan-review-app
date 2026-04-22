"use client"

import { useEffect } from "react"
import { useLoanReviewStore } from "@/store/loan-review"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function ReviewHistory() {
  const {
    reviewHistory,
    isLoadingHistory,
    historyError,
    fetchReviewHistory,
    viewHistoryItem,
  } = useLoanReviewStore()

  useEffect(() => {
    fetchReviewHistory()
  }, [fetchReviewHistory])

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <h2 className="text-lg font-semibold">Review History</h2>
      </div>

      {isLoadingHistory && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner />
          Loading review history...
        </div>
      )}

      {historyError && (
        <p className="py-4 text-sm text-muted-foreground">
          Could not load review history.
        </p>
      )}

      {!isLoadingHistory && !historyError && reviewHistory.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">
          No previous reviews.
        </p>
      )}

      {!isLoadingHistory && reviewHistory.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Filename</th>
                <th className="px-4 py-2.5 text-left font-medium">Created At</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviewHistory.map((item, index) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-2.5">{item.filename}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="outline" size="sm" onClick={() => viewHistoryItem(item)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
