"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const handleSubmit = async () => {
    setIsUploading(true)
    setMessage(null)

    const formData = new FormData()
    for (const file of files) {
      formData.append("files", file)
    }

    try {
      const res = await fetch("/api/risk-learning", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Upload failed")
      }

      setMessage({ type: "success", text: "Examples uploaded successfully." })
      setFiles([])
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review Admin</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
        <h2 className="text-xl font-semibold">Bad Loan Examples</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload PDFs of bad loan applications to improve the risk model. These
          examples will be used to train the system to recognize similar patterns.
        </p>

        <div className="mt-6">
          <FileUpload
            multiple
            files={files}
            onFilesChange={setFiles}
            label="Drop PDFs here or click to browse"
            description="One or more PDFs, up to 50MB each"
            maxFileSize={50 * 1024 * 1024}
          />
        </div>

        {message && (
          <p
            className={`mt-4 text-sm ${
              message.type === "success"
                ? "text-green-600"
                : "text-destructive"
            }`}
            role="alert"
          >
            {message.text}
          </p>
        )}

        <div className="mt-8 border-t pt-4">
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Examples"}
          </Button>
        </div>
      </main>
    </div>
  )
}
