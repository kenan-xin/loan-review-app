"use client"

import { useEffect } from "react"
import { useLoanReviewStore, tryResumeJob } from "@/store/loan-review"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ExamplesStep } from "@/components/examples-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"

export default function Page() {
  const {
    step,
    applicationFile,
    exampleFiles,
    jobId,
    result,
    error,
    isSubmitting,
    setStep,
    setApplicationFile,
    setExampleFiles,
    submit,
    reset,
    resumeJob,
  } = useLoanReviewStore()

  // Resume from sessionStorage on mount
  useEffect(() => {
    const savedJobId = tryResumeJob()
    if (savedJobId) {
      resumeJob(savedJobId)
    }
  }, [resumeJob])

  const handleBack = () => {
    if (step === 2) setStep(1)
  }

  const handleNext = () => {
    if (step === 1 && applicationFile) setStep(2)
    if (step === 2 && exampleFiles.length > 0) {
      submit()
    }
  }

  const handleRetry = () => {
    // Reset job state but keep files
    useLoanReviewStore.setState({
      jobId: null,
      error: null,
      result: null,
      step: 2,
    })
    sessionStorage.removeItem("loan-review-job-id")
  }

  const canGoNext =
    (step === 1 && !!applicationFile) || (step === 2 && exampleFiles.length > 0)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-8">
          <StepIndicator currentStep={step} />
        </div>

        <div className="flex-1">
          {step === 1 && (
            <UploadStep
              file={applicationFile}
              onFileChange={setApplicationFile}
            />
          )}
          {step === 2 && (
            <ExamplesStep
              files={exampleFiles}
              onFilesChange={setExampleFiles}
            />
          )}
          {step === 3 && (
            <ProcessingStep
              isSubmitting={isSubmitting}
              error={error}
              onRetry={handleRetry}
            />
          )}
          {step === 4 && result && (
            <ResultsStep result={result} onStartNew={reset} />
          )}
        </div>

        {step !== 4 && (
          <div className="mt-8 border-t pt-4">
            <WizardFooter
              onBack={step === 2 ? handleBack : undefined}
              onNext={step <= 2 ? handleNext : undefined}
              nextLabel={step === 2 ? "Submit for Review" : "Next"}
              nextDisabled={!canGoNext}
              backDisabled={step === 3 && !!jobId}
              nextLoading={isSubmitting}
            />
          </div>
        )}
      </main>
    </div>
  )
}
