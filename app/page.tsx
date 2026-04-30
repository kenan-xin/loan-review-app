"use client"

import { Suspense, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useLoanReviewStore } from "@/store/loan-review"
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
    result,
    error,
    isSubmitting,
    isLoadingHistory,
    historyError,
    setApplicationFile,
    submit,
    reset,
    loadHistoryById,
  } = useLoanReviewStore()

  useEffect(() => {
    if (!idParam) return
    const id = Number(idParam)
    if (Number.isNaN(id)) return
    // Only load if we don't already have a result for this id
    loadHistoryById(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Push browser history entries for step 2 & 3 so back button works
  useEffect(() => {
    if (step === 2) {
      window.history.pushState({ step: 2 }, "")
    } else if (step === 3) {
      window.history.pushState({ step: 3 }, "")
    }
  }, [step])

  // Handle browser back button
  useEffect(() => {
    const onPopState = () => {
      const s = useLoanReviewStore.getState().step
      if (s > 1) {
        useLoanReviewStore.setState({
          step: 1,
          error: null,
          result: null,
          isSubmitting: false,
          stage: "idle",
        })
      }
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const handleNext = () => {
    if (step === 1 && applicationFile) submit()
  }

  const handleRetry = () => {
    useLoanReviewStore.setState({
      error: null,
      result: null,
      step: 1,
    })
    router.replace("/")
  }

  const handleReset = () => {
    reset()
    router.replace("/")
  }

  // Loading state while fetching history by URL param
  if (idParam && !result && isLoadingHistory) {
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

  // Error state for invalid/missing history ID
  if (idParam && !result && historyError) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Loan Review</h1>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6">
          <p className="text-sm text-muted-foreground">{historyError}</p>
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
            <UploadStep
              file={applicationFile}
              onFileChange={setApplicationFile}
            />
          )}
          {step === 2 && (
            <ProcessingStep
              error={error}
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
              nextLoading={isSubmitting}
            />
          </div>
        )}
      </main>
    </div>
  )
}
