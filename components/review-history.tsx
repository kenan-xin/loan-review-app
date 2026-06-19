"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { useLoanReviewStore } from "@/store/loan-review"
import { useResultStatuses, useDeleteHistory } from "@/lib/loan-review/hooks"
import type { ResultStatus } from "@/lib/loan-review/api"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
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

const STATUS_LABEL: Record<ResultStatus["status"], string> = {
  initial: "Queued",
  extracted: "Extracting",
  checked: "Checking",
  done: "Done",
}

const STATUS_CLASS: Record<ResultStatus["status"], string> = {
  initial: "bg-muted text-muted-foreground",
  extracted: "bg-blue-100 text-blue-700",
  checked: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
}

function StatusBadge({ status }: { status: ResultStatus["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function DeleteButton({
  itemId,
  filename,
  onConfirm,
}: {
  itemId: number
  filename: string
  onConfirm: (id: number) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  const handleDelete = useCallback(async () => {
    setOpen(false)
    try {
      await onConfirm(itemId)
      toast.success(`"${filename}" deleted`)
    } catch {
      toast.error(`Failed to delete "${filename}"`)
    }
  }, [itemId, filename, onConfirm])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${filename}`} />
        }
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
  const setViewingId = useLoanReviewStore((s) => s.setViewingId)
  const { data: rows = [], isLoading, isError } = useResultStatuses()
  const deleteMut = useDeleteHistory()

  const handleDelete = useCallback(
    (id: number) => deleteMut.mutateAsync(id),
    [deleteMut]
  )

  return (
    <div className="space-y-4">
      <Separator />
      <div>
        <h2 className="text-lg font-semibold">Review History</h2>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner />
          Loading review history...
        </div>
      )}

      {isError && (
        <p className="py-4 text-sm text-muted-foreground">
          Could not load review history.
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">No previous reviews.</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Filename</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-left font-medium">Created At</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const isDone = item.status === "done"
                return (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-2.5">{item.filename}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!isDone}
                          title={isDone ? undefined : "Review still in progress"}
                          onClick={() => {
                            setViewingId(item.id)
                            router.push(`/?id=${item.id}`)
                          }}
                        >
                          View
                        </Button>
                        <DeleteButton
                          itemId={item.id}
                          filename={item.filename}
                          onConfirm={handleDelete}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
