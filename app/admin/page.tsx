"use client"

import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUploadExamplesStore } from "@/store/upload-examples"
import { cn } from "@/lib/utils"
import type { FileEntry } from "@/types/upload"
import { useState } from "react"
import { Clock, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react"

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const statusConfig = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  uploading: { icon: Loader2, color: "text-blue-500", label: "Uploading" },
  success: { icon: CheckCircle2, color: "text-green-600", label: "Success" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
} as const

export default function AdminPage() {
  const { phase, files, isUploading, setFiles, uploadAll, retryFailed, reset } =
    useUploadExamplesStore()

  const [selectedFile, setSelectedFile] = useState<number | null>(null)

  const selectedFiles = files.map((e) => e.file)

  const successCount = files.filter((e) => e.status === "success").length
  const failedCount = files.filter((e) => e.status === "failed").length

  if (phase === "idle") {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center border-b px-6 py-4">
          <h1 className="text-lg font-semibold">Loan Review Admin</h1>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
          <h2 className="text-xl font-semibold">Upload Credit Notes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload credit notes and lessons learnt documents. The system will
            extract checklist rules from these documents to use when reviewing
            loan applications.
          </p>

          <div className="mt-6">
            <FileUpload
              multiple
              files={selectedFiles}
              onFilesChange={setFiles}
              label="Drop PDFs here or click to browse"
              description="One or more PDFs, up to 50MB each"
              maxFileSize={50 * 1024 * 1024}
            />
          </div>

          <div className="mt-8 border-t pt-4">
            <Button
              onClick={uploadAll}
              disabled={files.length === 0 || isUploading}
            >
              Upload Credit Notes
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Phase: uploading | done
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Loan Review Admin</h1>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
        <h2 className="text-xl font-semibold">Uploading Credit Notes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {phase === "uploading"
            ? "Processing documents one at a time..."
            : `${successCount}/${files.length} documents processed successfully.`}
        </p>

        <ul className="mt-6 space-y-2">
          {files.map((entry, i) => {
            const config = statusConfig[entry.status]
            const Icon = config.icon
            const spinning = entry.status === "uploading"
            const clickable = entry.status === "success" && entry.response

            return (
              <li
                key={`${entry.file.name}-${i}`}
                className={cn(
                  "flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2",
                  clickable && "cursor-pointer hover:bg-muted"
                )}
                onClick={clickable ? () => setSelectedFile(i) : undefined}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">
                  {entry.file.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatSize(entry.file.size)}
                </span>
                {entry.retries > 0 && entry.status !== "success" && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    (attempt {entry.retries}/{3})
                  </span>
                )}
                <span
                  className={`flex shrink-0 items-center gap-1 text-xs font-medium ${config.color}`}
                >
                  <Icon
                    className={`size-3.5 ${spinning ? "animate-spin" : ""}`}
                  />
                  {config.label}
                </span>
              </li>
            )
          })}
        </ul>

        {phase === "done" && (
          <div className="mt-8 space-y-3 border-t pt-4">
            {failedCount > 0 && (
              <p className="text-sm text-destructive">
                {failedCount} file{failedCount !== 1 ? "s" : ""} failed to
                upload.
              </p>
            )}
            <div className="flex gap-3">
              {failedCount > 0 && (
                <Button onClick={retryFailed} disabled={isUploading}>
                  Retry Failed
                </Button>
              )}
              <Button variant="outline" onClick={reset}>
                Start Over
              </Button>
            </div>
          </div>
        )}
      </main>

      <ResponseDialog
        entry={selectedFile !== null ? files[selectedFile] : null}
        onClose={() => setSelectedFile(null)}
      />
    </div>
  )
}

interface Rule {
  title?: string
  description?: string
  category_5c?: string
  applicable_scenario?: string | null
  required_fields?: string[]
  validation_logic?: string
  risk_level?: string
  action_if_fail?: string
  action_if_warning?: string
  action_if_missing?: string
  source_evidence?: string[]
}

type RiskLevel = "High" | "Medium" | "Low"

const riskConfig: Record<
  RiskLevel,
  { bg: string; badge: string; label: string }
> = {
  High: {
    bg: "bg-red-500/[0.05] dark:bg-red-500/[0.08]",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
    label: "High Risk",
  },
  Medium: {
    bg: "bg-amber-500/[0.05] dark:bg-amber-500/[0.08]",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    label: "Medium Risk",
  },
  Low: {
    bg: "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    label: "Low Risk",
  },
}

function ResponseDialog({
  entry,
  onClose,
}: {
  entry: FileEntry | null
  onClose: () => void
}) {
  const open = entry !== null && entry.status === "success" && !!entry.response

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 pt-5 pb-4">
          <DialogTitle className="truncate pr-8 text-base font-semibold">
            {entry?.file.name ?? "Response"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Extracted checklist rules
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {entry?.response && <ResponseContent data={entry.response} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const riskOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

function ResponseContent({ data }: { data: Record<string, unknown> }) {
  const rawRules = Array.isArray(data.rules) ? (data.rules as Rule[]) : null
  const rules = rawRules
    ? [...rawRules].sort(
        (a, b) =>
          (riskOrder[a.risk_level ?? ""] ?? 3) -
          (riskOrder[b.risk_level ?? ""] ?? 3)
      )
    : null
  const rowsAffected =
    typeof data.rowsAffected === "number" ? data.rowsAffected : null

  return (
    <div className="space-y-3">
      {rowsAffected !== null && (
        <p className="pb-3 text-xs text-muted-foreground">
          {rowsAffected} checklist rule{rowsAffected !== 1 ? "s" : ""} added to
          database
        </p>
      )}
      {rules && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <RuleCard key={i} rule={rule} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function RuleCard({ rule, index }: { rule: Rule; index: number }) {
  const rc = rule.risk_level
    ? riskConfig[rule.risk_level as RiskLevel]
    : undefined

  const actions = [
    rule.action_if_fail && rule.action_if_fail !== "N/A"
      ? {
          label: "FAIL",
          text: rule.action_if_fail,
          labelCls: "text-red-600 dark:text-red-400",
        }
      : null,
    rule.action_if_warning && rule.action_if_warning !== "N/A"
      ? {
          label: "WARN",
          text: rule.action_if_warning,
          labelCls: "text-amber-600 dark:text-amber-400",
        }
      : null,
    rule.action_if_missing && rule.action_if_missing !== "N/A"
      ? {
          label: "MISSING",
          text: rule.action_if_missing,
          labelCls: "text-sky-600 dark:text-sky-400",
        }
      : null,
  ].filter(Boolean)

  const hasTechnical =
    !!rule.validation_logic ||
    (rule.required_fields && rule.required_fields.length > 0)

  return (
    <div className={cn("overflow-hidden rounded-xl", rc?.bg ?? "bg-muted/30")}>
      {/* — Header ————————————————————————————————————————— */}
      <div className="px-5 pt-4 pb-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {rc && (
              <span
                className={cn(
                  "rounded px-1.5 py-px text-[10px] font-semibold tracking-wide",
                  rc.badge
                )}
              >
                {rc.label}
              </span>
            )}
            {rule.category_5c && (
              <span className="rounded bg-black/[0.06] px-1.5 py-px text-[10px] font-medium text-muted-foreground dark:bg-white/[0.08]">
                {rule.category_5c}
              </span>
            )}
          </div>
          <span className="mt-px shrink-0 font-mono text-[10px] text-muted-foreground/35">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        {rule.title && (
          <p className="text-[13px] leading-snug font-semibold text-foreground">
            {rule.title}
          </p>
        )}
      </div>

      {/* — Description ———————————————————————————————————— */}
      {rule.description && (
        <div className="px-5 pb-4">
          <p className="text-xs leading-[1.7] text-muted-foreground">
            {rule.description}
          </p>
        </div>
      )}

      {/* — Actions ———————————————————————————————————————— */}
      {actions.length > 0 && (
        <div className="px-5 pb-4">
          <div className="mb-3 h-px bg-foreground/[0.12]" />
          <div className="space-y-1.5">
            {actions.map((action) =>
              action ? (
                <div key={action.label} className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "w-[52px] shrink-0 text-[10px] font-bold tracking-widest",
                      action.labelCls
                    )}
                  >
                    {action.label}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {action.text}
                  </span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* — Technical ————————————————————————————————————————— */}
      {hasTechnical && (
        <div className="space-y-3 bg-black/[0.03] px-5 py-3 dark:bg-white/[0.03]">
          {rule.validation_logic && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground/50 uppercase">
                Validation Logic
              </p>
              <pre className="rounded-lg bg-background/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
                {rule.validation_logic}
              </pre>
            </div>
          )}
          {rule.required_fields && rule.required_fields.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground/50 uppercase">
                Required Fields
              </p>
              <div className="flex flex-wrap gap-1">
                {rule.required_fields.map((field, fi) => (
                  <code
                    key={fi}
                    className="rounded-md bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {field}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* — Source ————————————————————————————————————————— */}
      {rule.source_evidence && rule.source_evidence.length > 0 && (
        <div className="space-y-0.5 bg-black/[0.02] px-5 py-3 dark:bg-white/[0.02]">
          {rule.source_evidence.map((src, si) => (
            <p
              key={si}
              className="truncate text-[10px] leading-snug text-muted-foreground/70"
              title={src}
            >
              {src}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
