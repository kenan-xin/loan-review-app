"use client"

import { FileUpload } from "@/components/file-upload"

interface ExamplesStepProps {
  files: File[]
  onFilesChange: (files: File[]) => void
}

export function ExamplesStep({ files, onFilesChange }: ExamplesStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Bad Examples</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload past examples of problematic loan applications. The AI will
          learn to identify similar patterns in the new application.
        </p>
      </div>
      <FileUpload
        multiple
        files={files}
        onFilesChange={onFilesChange}
        label="Drop PDFs here or click to browse"
        description="One or more PDFs, up to 10MB each"
      />
    </div>
  )
}
