"use client"

import { Suspense, useEffect } from "react"
import { useQueryState } from "nuqs"
import { useLoanReviewStore } from "@/store/loan-review"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"

export default function Page() {
  return (
    <Suspense>
      <LoanReviewWizard />
    </Suspense>
  )
}

function LoanReviewWizard() {
  const [urlJobId, setUrlJobId] = useQueryState("jobId")

  const {
    step,
    applicationFile,
    jobId,
    result,
    error,
    isSubmitting,
    setApplicationFile,
    submit,
    reset,
    resumeJob,
  } = useLoanReviewStore()

  // Sync URL → store on mount (resume from query string)
  useEffect(() => {
    if (urlJobId && !jobId) {
      resumeJob(urlJobId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync store → URL when jobId changes
  useEffect(() => {
    if (jobId && jobId !== urlJobId) {
      setUrlJobId(jobId)
    }
    if (!jobId && urlJobId) {
      setUrlJobId(null)
    }
  }, [jobId, urlJobId, setUrlJobId])

  const handleNext = () => {
    if (step === 1 && applicationFile) submit()
  }

  const handleRetry = () => {
    useLoanReviewStore.setState({
      jobId: null,
      error: null,
      result: null,
      step: 1,
    })
    setUrlJobId(null)
  }

  const canGoNext = step === 1 && !!applicationFile

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
            <ProcessingStep
              isSubmitting={isSubmitting}
              error={error}
              onRetry={handleRetry}
            />
          )}
          {step === 3 && result && (
            <ResultsStep result={result} onStartNew={reset} />
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
