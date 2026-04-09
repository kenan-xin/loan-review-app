"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"

interface WizardFooterProps {
  onBack?: () => void
  onNext?: () => void
  backLabel?: string
  nextLabel?: string
  backDisabled?: boolean
  nextDisabled?: boolean
  nextLoading?: boolean
}

export function WizardFooter({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Next",
  backDisabled = false,
  nextDisabled = false,
  nextLoading = false,
}: WizardFooterProps) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      {onBack ? (
        <Button
          variant="outline"
          onClick={onBack}
          disabled={backDisabled}
          data-icon="inline-start"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>
      ) : (
        <div />
      )}
      {onNext && (
        <Button
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
        >
          {nextLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
