"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProcessingStepProps {
  isSubmitting: boolean
  error: string | null
  onRetry: () => void
}

export function ProcessingStep({
  isSubmitting,
  error,
  onRetry,
}: ProcessingStepProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (error) return

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [error])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium">Submitting for review...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <span className="text-2xl text-destructive">!</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold">Review Failed</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
        <Button onClick={onRetry} className="mt-6">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <h3 className="mt-4 text-lg font-semibold">
        AI is reviewing the application
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This may take between 5 and 30 minutes. You can leave this page and come
        back — your review will continue in the background.
      </p>
      <p className="mt-4 font-mono text-sm text-muted-foreground">
        Elapsed: {formatTime(elapsed)}
      </p>
    </div>
  )
}
