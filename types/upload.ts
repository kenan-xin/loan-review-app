export type FileUploadStatus = "pending" | "uploading" | "success" | "failed"
export type UploadPhase = "idle" | "uploading" | "done"

export interface FileEntry {
  file: File
  status: FileUploadStatus
  retries: number
  errorMessage?: string
  response?: Record<string, unknown>
}
