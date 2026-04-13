"use client"

import { Suspense, useEffect } from "react"
import { useQueryState } from "nuqs"
import { useLoanReviewStore } from "@/store/loan-review"
import { StepIndicator } from "@/components/step-indicator"
import { WizardFooter } from "@/components/wizard-footer"
import { UploadStep } from "@/components/upload-step"
import { ProcessingStep } from "@/components/processing-step"
import { ResultsStep } from "@/components/results-step"
import { ThemeToggle } from "@/components/theme-toggle"
import { ChatBubble } from "@/components/chat-bubble"
import {
  loadSimulationData,
  transformToReviewResult,
} from "@/lib/simulate-review"

// Set to true to skip processing delay and go straight to results after upload
const DEBUG_SKIP_PROCESSING = true

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
    processingProgress,
    setApplicationFile,
    submit,
    reset,
    resumeJob,
  } = useLoanReviewStore()

  useEffect(() => {
    if (urlJobId && !jobId) {
      resumeJob(urlJobId)
    }
  }, [])

  useEffect(() => {
    if (jobId && jobId !== urlJobId) {
      setUrlJobId(jobId)
    }
    if (!jobId && urlJobId) {
      setUrlJobId(null)
    }
  }, [jobId, urlJobId, setUrlJobId])

  // Debug: skip processing delay, load results instantly after upload
  useEffect(() => {
    if (DEBUG_SKIP_PROCESSING && isSubmitting && !result) {
      const {
        caData,
        evaluationResults,
        evaluationSummary,
        evaluationDecision,
      } = loadSimulationData()
      const r = transformToReviewResult(
        caData,
        evaluationResults,
        evaluationSummary,
        evaluationDecision
      )
      useLoanReviewStore.setState({
        result: r,
        step: 3,
        isSubmitting: false,
        processingProgress: 100,
        jobId: `debug-${Date.now()}`,
      })
    }
  }, [isSubmitting, result])

  const handleNext = () => {
    if (step === 1 && applicationFile) submit()
  }

  const handleRetry = () => {
    useLoanReviewStore.setState({
      jobId: null,
      error: null,
      result: null,
      step: 1,
      processingProgress: 0,
    })
    setUrlJobId(null)
  }

  const canGoNext = step === 1 && !!applicationFile

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review</h1>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
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
              isSubmitting={isSubmitting}
              error={error}
              processingProgress={processingProgress}
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
