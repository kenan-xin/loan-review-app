"use client"

import { FileUpload } from "@/components/file-upload"
import { ReviewHistory } from "@/components/review-history"

interface UploadStepProps {
  file: File | null
  onFileChange: (file: File | null) => void
}

export function UploadStep({ file, onFileChange }: UploadStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Loan Application</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the loan application form you want the AI to review.
        </p>
      </div>
      <FileUpload
        files={file ? [file] : []}
        onFilesChange={(files) => onFileChange(files[0] ?? null)}
        label="Drop your PDF here or click to browse"
        description="PDF only, up to 10MB"
      />
      <ReviewHistory />
    </div>
  )
}
