"use client"

import { Suspense } from "react"
import { useLoanReviewStore } from "@/store/loan-review"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"
import { ThemeToggle } from "@/components/theme-toggle"
import { LayoutSwitcher } from "@/components/layout-switcher"
import { ChatBubble } from "@/components/chat-bubble"

export default function Page() {
  return (
    <Suspense>
      <LoanReviewWizard />
    </Suspense>
  )
}

function LoanReviewWizard() {
  const {
    step,
    applicationFile,
    result,
    error,
    isSubmitting,
    setApplicationFile,
    submit,
    reset,
  } = useLoanReviewStore()

  const handleNext = () => {
    if (step === 1 && applicationFile) submit()
  }

  const handleRetry = () => {
    useLoanReviewStore.setState({
      error: null,
      result: null,
      step: 1,
    })
  }

  const canGoNext = step === 1 && !!applicationFile

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review</h1>
        <div className="flex items-center gap-0.5">
          {step === 3 && <LayoutSwitcher />}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-6">
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
              <ResultsStep result={result} onStartNew={reset} />
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
