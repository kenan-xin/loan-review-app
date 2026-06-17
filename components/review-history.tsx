"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLoanReviewStore } from "@/store/loan-review"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
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

function DeleteButton({ itemId, filename, onConfirm }: { itemId: number; filename: string; onConfirm: (id: number) => Promise<void> }) {
  const [open, setOpen] = useState(false)

  const handleDelete = useCallback(async () => {
    setOpen(false)
    try {
      await onConfirm(itemId)
      toast.success(`"${filename}" deleted`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [itemId, filename, onConfirm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Delete ${filename}`} />}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-48 rounded-lg p-3" align="end">
        <PopoverTitle>Delete &quot;{filename}&quot;?</PopoverTitle>
        <PopoverDescription>This action cannot be undone.</PopoverDescription>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ReviewHistory() {
  const router = useRouter()
  const {
    reviewHistory,
    deletingIds,
    isLoadingHistory,
    historyError,
    fetchReviewHistory,
    viewHistoryItem,
    deleteHistoryItem,
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
                <tr
                  key={item.id}
                  className="border-b last:border-b-0 transition-opacity duration-200 data-[deleting]:opacity-40"
                  data-deleting={deletingIds.includes(item.id) || undefined}
                >
                  <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-2.5">{item.filename}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { viewHistoryItem(item); router.push(`/?id=${item.id}`) }}>
                        View
                      </Button>
                      <DeleteButton itemId={item.id} filename={item.filename} onConfirm={deleteHistoryItem} />
                    </div>
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
