"use client"

import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const ACCEPTED_TYPE = "application/pdf"

interface FileUploadProps {
  multiple?: boolean
  maxFileSize?: number
  files: File[]
  onFilesChange: (files: File[]) => void
  label: string
  description: string
}

export function FileUpload({
  multiple = false,
  maxFileSize = 10 * 1024 * 1024,
  files,
  onFilesChange,
  label,
  description,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (
      file.type !== ACCEPTED_TYPE &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return `"${file.name}" is not a PDF. Only PDF files are accepted.`
    }
    if (file.size > maxFileSize) {
      return `"${file.name}" exceeds the ${Math.round(maxFileSize / 1024 / 1024)}MB size limit.`
    }
    return null
  }

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(incoming)

      for (const file of fileArray) {
        const err = validateFile(file)
        if (err) {
          setError(err)
          return
        }
      }

      if (multiple) {
        // Dedupe by name — new files replace existing with same name
        const existing = new Map(files.map((f) => [f.name, f]))
        for (const f of fileArray) {
          existing.set(f.name, f)
        }
        onFilesChange(Array.from(existing.values()))
      } else {
        onFilesChange(fileArray.slice(0, 1))
      }
    },
    [files, onFilesChange, multiple, maxFileSize]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
    // Reset input so the same file can be re-selected
    e.target.value = ""
  }

  const removeFile = (name: string) => {
    onFilesChange(files.filter((f) => f.name !== name))
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick()
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
          dragActive && "border-primary bg-primary/5",
          !dragActive &&
            files.length === 0 &&
            "border-muted-foreground/25 hover:border-muted-foreground/50",
          !dragActive && files.length > 0 && "border-primary/30 bg-primary/5"
        )}
      >
        <Upload className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-label={label}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  removeFile(file.name)
                }}
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
