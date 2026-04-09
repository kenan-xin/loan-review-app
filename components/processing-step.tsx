"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProcessingStepProps {
  isSubmitting: boolean
  error: string | null
  processingProgress: number
  onRetry: () => void
}

interface Step {
  id: number
  text: string
}

const PROCESSING_STEPS: Step[] = [
  { id: 1, text: "Verifying company information" },
  { id: 2, text: "Analysing ownership structure" },
  { id: 3, text: "Checking eligibility criteria" },
  { id: 4, text: "Running credit assessment" },
  { id: 5, text: "Evaluating financial ratios" },
  { id: 6, text: "Assessing risk factors" },
]

const STEP_DURATION = 20000

function AnimatedDots({ isActive }: { isActive: boolean }) {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setDots((prev) => (prev >= 4 ? 1 : prev + 1))
    }, 500)

    return () => clearInterval(interval)
  }, [isActive])

  return <span className="inline-block w-6 text-left">{".".repeat(dots)}</span>
}

export function ProcessingStep({
  isSubmitting,
  error,
  processingProgress,
  onRetry,
}: ProcessingStepProps) {
  const [elapsed, setElapsed] = useState(0)
  const [visibleStepIndex, setVisibleStepIndex] = useState(0)

  useEffect(() => {
    if (error) return

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [error])

  useEffect(() => {
    if (isSubmitting && visibleStepIndex === 0) {
      const timer = setTimeout(() => {
        setVisibleStepIndex(1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isSubmitting, visibleStepIndex])

  useEffect(() => {
    if (
      visibleStepIndex >= PROCESSING_STEPS.length ||
      !isSubmitting ||
      visibleStepIndex === 0
    ) {
      return
    }

    const timer = setTimeout(() => {
      setVisibleStepIndex((prev) => prev + 1)
    }, STEP_DURATION)

    return () => clearTimeout(timer)
  }, [visibleStepIndex, isSubmitting])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const remaining = Math.max(0, 120 - elapsed)

  if (isSubmitting) {
    // Cap at last step — never show "complete" until isSubmitting becomes false
    const displayIndex = Math.min(visibleStepIndex, PROCESSING_STEPS.length)
    const activeStepIndex = Math.min(displayIndex, PROCESSING_STEPS.length - 1)

    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <h3 className="text-lg font-semibold">Processing Application</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Please wait while we analyse the documents
        </p>

        <div className="mt-6 w-full max-w-md rounded-lg border p-4 text-left shadow-sm">
          {/* Current active step as the hero row */}
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {displayIndex > 0
                ? PROCESSING_STEPS[activeStepIndex]?.text
                : "Starting"}
              <AnimatedDots isActive={true} />
            </span>
          </div>

          {/* Completed steps shown as history */}
          {activeStepIndex > 0 && (
            <div className="mt-3 space-y-1.5 border-t pt-3">
              {PROCESSING_STEPS.slice(0, activeStepIndex).map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="size-3 shrink-0 text-muted-foreground/50" />
                  <span>{step.text}</span>
                </div>
              ))}
            </div>
          )}

          {displayIndex > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Step {Math.min(displayIndex, PROCESSING_STEPS.length)} of {PROCESSING_STEPS.length}
            </div>
          )}
        </div>

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
      <Loader2 className="size-10 animate-spin text-primary" />
      <h3 className="mt-4 text-lg font-semibold">
        AI is reviewing the application
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Simulating document analysis and evaluation. This takes approximately 2
        minutes.
      </p>

      <div className="mt-6 w-full max-w-xs">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(processingProgress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 font-mono text-sm">
        <span className="text-muted-foreground">Time remaining: </span>
        <span className="font-medium">{formatTime(remaining)}</span>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Elapsed: {formatTime(elapsed)}
      </p>
    </div>
  )
}
