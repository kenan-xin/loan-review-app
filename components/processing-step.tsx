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
  { id: "extracting", label: "Extracting CA data" },
  { id: "checking", label: "Running evaluation rules" },
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
  const { stage, isSubmitting, ruleIndex } = useLoanReviewStore()

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

  const activeStageIndex = STAGES.findIndex((s) => s.id === stage)

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-lg font-semibold">Processing Application</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Please wait while we analyse the documents
      </p>

      <div className="mt-6 w-full max-w-md rounded-lg border p-4 text-left shadow-sm">
        {activeStageIndex >= 0 && (
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {stage === "checking"
                ? `Evaluating rule ${ruleIndex + 1}`
                : STAGES[activeStageIndex].label}
              <AnimatedDots />
            </span>
          </div>
        )}

        {activeStageIndex > 0 && (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            {STAGES.slice(0, activeStageIndex).map((s) => (
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
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Elapsed: {formatTime(elapsed)}
      </p>
    </div>
  )
}
