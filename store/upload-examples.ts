import { create } from "zustand"
import type { FileEntry, UploadPhase } from "@/types/upload"

const MAX_RETRIES = 3

interface UploadExamplesState {
  phase: UploadPhase
  files: FileEntry[]
  isUploading: boolean

  setFiles: (files: File[]) => void
  uploadAll: () => Promise<void>
  retryFailed: () => Promise<void>
  reset: () => void
}

export const useUploadExamplesStore = create<UploadExamplesState>(
  (set, get) => ({
    phase: "idle",
    files: [],
    isUploading: false,

    setFiles: (files: File[]) => {
      set({
        files: files.map((file) => ({
          file,
          status: "pending",
          retries: 0,
        })),
      })
    },

    uploadAll: async () => {
      const { files, isUploading } = get()
      if (isUploading) return

      set({ phase: "uploading", isUploading: true })

      for (let i = 0; i < files.length; i++) {
        const entry = get().files[i]
        if (!entry || entry.status === "success") continue

        updateFileAt(set, get, i, { status: "uploading" })

        let succeeded = false

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const formData = new FormData()
            formData.append("doc", entry.file)

            const res = await fetch("/api/risk-learning", {
              method: "POST",
              body: formData,
            })

            const data = await res.json()

            if (res.ok && data.success) {
              const { success, ...response } = data
              updateFileAt(set, get, i, { status: "success", response })
              succeeded = true
              break
            }

            updateFileAt(set, get, i, {
              retries: attempt,
              errorMessage: data.error ?? `HTTP ${res.status}`,
            })
          } catch (err) {
            updateFileAt(set, get, i, {
              retries: attempt,
              errorMessage:
                err instanceof Error ? err.message : "Network error",
            })
          }
        }

        if (!succeeded) {
          updateFileAt(set, get, i, { status: "failed" })
        }
      }

      set({ phase: "done", isUploading: false })
    },

    retryFailed: async () => {
      const { files, isUploading } = get()
      if (isUploading) return

      const updated = files.map((entry) =>
        entry.status === "failed"
          ? {
              ...entry,
              status: "pending" as const,
              retries: 0,
              errorMessage: undefined,
            }
          : entry
      )

      set({ files: updated })
      await get().uploadAll()
    },

    reset: () => {
      set({ phase: "idle", files: [], isUploading: false })
    },
  })
)

function updateFileAt(
  set: (partial: Partial<UploadExamplesState>) => void,
  get: () => UploadExamplesState,
  index: number,
  update: Partial<FileEntry>
) {
  const files = [...get().files]
  files[index] = { ...files[index], ...update }
  set({ files })
}
