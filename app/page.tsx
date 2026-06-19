"use client"

import { Suspense, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLoanReviewStore } from "@/store/loan-review"
import {
  useSubmitReview,
  useTaskStatus,
  useHistoryItem,
} from "@/lib/loan-review/hooks"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"
import { ChatBubble } from "@/components/chat-bubble"
import { Spinner } from "@/components/ui/spinner"

export default function Page() {
  return (
    <Suspense>
      <LoanReviewWizard />
    </Suspense>
  )
}

function LoanReviewWizard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const idParam = searchParams.get("id")

  const {
    step,
    applicationFile,
    taskId,
    viewingId,
    setStep,
    setApplicationFile,
    setTaskId,
    setViewingId,
    reset,
  } = useLoanReviewStore()

  const submitMut = useSubmitReview()
  const { phase, progress, result: liveResult, taskError, isLoading: statusLoading } =
    useTaskStatus(taskId)
  const historyItem = useHistoryItem(viewingId)

  // The result to render: a viewed history item takes precedence, else the live run.
  const result = viewingId != null ? (historyItem.data ?? null) : liveResult
  const error = taskError ?? (submitMut.error ? String(submitMut.error.message) : null)

  // On mount: open a shared link (?id=) or resume a persisted in-flight task.
  useEffect(() => {
    if (idParam) {
      const id = Number(idParam)
      if (!Number.isNaN(id)) {
        setViewingId(id)
        setStep(3)
      }
      return
    }
    const persisted = useLoanReviewStore.getState()
    if (persisted.viewingId != null) setStep(3)
    else if (persisted.taskId) setStep(2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Advance to results once a live run completes.
  useEffect(() => {
    if (liveResult && viewingId == null && step === 2) setStep(3)
  }, [liveResult, viewingId, step, setStep])

  // Browser history entries so the back button works.
  useEffect(() => {
    if (step === 2 || step === 3) window.history.pushState({ step }, "")
  }, [step])

  // Back button → return to upload, clearing the active run / viewed item.
  useEffect(() => {
    const onPopState = () => {
      if (useLoanReviewStore.getState().step > 1) {
        setStep(1)
        setTaskId(null)
        setViewingId(null)
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [setStep, setTaskId, setViewingId])

  const handleNext = () => {
    if (step !== 1 || !applicationFile) return
    submitMut.mutate(applicationFile, {
      onSuccess: (res) => {
        setTaskId(res.taskID)
        setStep(2)
      },
      onError: (e) => toast.error(`Could not start review: ${e.message}`),
    })
  }

  const handleRetry = () => {
    submitMut.reset()
    setTaskId(null)
    setViewingId(null)
    setStep(1)
    router.replace("/")
  }

  const handleReset = () => {
    reset()
    router.replace("/")
  }

  // Loading a shared review link.
  if (idParam && !result && historyItem.isLoading) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Loan Review</h1>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading review...
          </div>
        </main>
      </div>
    )
  }

  // Invalid/missing shared review link.
  if (idParam && !result && historyItem.isError) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Loan Review</h1>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <p className="text-sm text-muted-foreground">
            {String(historyItem.error?.message ?? "Review not found")}
          </p>
          <button
            onClick={handleReset}
            className="mt-4 text-sm underline text-primary"
          >
            Start New Review
          </button>
        </main>
      </div>
    )
  }

  const canGoNext = step === 1 && !!applicationFile

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review</h1>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="relative mb-6 flex w-full items-center justify-center">
          {step === 3 && (
            <button
              onClick={handleReset}
              className="absolute left-0 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          )}
          <StepIndicator currentStep={step} />
        </div>

        <div className="min-h-0 flex-1">
          {step === 1 && (
            <UploadStep file={applicationFile} onFileChange={setApplicationFile} />
          )}
          {step === 2 && (
            <ProcessingStep
              phase={phase}
              progress={progress}
              error={error}
              isLoading={statusLoading}
              onRetry={handleRetry}
            />
          )}
          {step === 3 && result && (
            <>
              <ResultsStep result={result} />
              <ChatBubble result={result} />
            </>
          )}
        </div>

        {step === 1 && (
          <div className="mt-8 border-t pt-4">
            <WizardFooter
              onNext={handleNext}
              nextLabel="Submit for Review"
              nextDisabled={!canGoNext}
              nextLoading={submitMut.isPending}
            />
          </div>
        )}
      </main>
    </div>
  )
}
