"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SseStage } from "@/store/loan-review"
import { useLoanReviewStore } from "@/store/loan-review"

interface ProcessingStepProps {
  error: string | null
  onRetry: () => void
}

const STAGES: Array<{ id: SseStage; label: string }> = [
  { id: "processing_document", label: "Processing document" },
  { id: "extracting", label: "Extracting" },
  { id: "checking", label: "Checking" },
  { id: "completed", label: "Completed" },
]

const STAGE_ORDER: SseStage[] = [
  "processing_document",
  "extracting",
  "checking",
  "completed",
]

function AnimatedDots() {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev >= 4 ? 1 : prev + 1))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return <span className="inline-block w-6 text-left">{".".repeat(dots)}</span>
}

export function ProcessingStep({ error, onRetry }: ProcessingStepProps) {
  const { stage, completedStages, isSubmitting } = useLoanReviewStore()

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

  if (!isSubmitting && stage !== "completed") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="size-10 animate-spin text-primary" />
        <h3 className="mt-4 text-lg font-semibold">
          AI is reviewing the application
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Please wait while we analyse the documents
        </p>
      </div>
    )
  }

  const currentStageIndex = stage === "idle" ? -1 : STAGE_ORDER.indexOf(stage)
  const activeStageIndex = Math.max(0, currentStageIndex)

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-lg font-semibold">Processing Application</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Please wait while we analyse the documents
      </p>

      <div className="mt-6 w-full max-w-md rounded-lg border p-4 text-left shadow-sm">
        {currentStageIndex >= 0 && currentStageIndex < STAGES.length - 1 && (
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {STAGES[activeStageIndex].label}
              <AnimatedDots />
            </span>
          </div>
        )}

        {completedStages.size > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            {STAGES.filter(
              (s) =>
                s.id !== "completed" &&
                completedStages.has(s.id) &&
                STAGE_ORDER.indexOf(s.id) < activeStageIndex
            ).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Check className="size-3 shrink-0 text-muted-foreground/50" />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          Step {Math.min(activeStageIndex + 1, STAGES.length)} of {STAGES.length}
        </div>
      </div>

      <div className="mt-4 font-mono text-sm">
        <span className="text-muted-foreground">Elapsed: </span>
        <span className="font-medium">{formatTime(elapsed)}</span>
      </div>
    </div>
  )
}
