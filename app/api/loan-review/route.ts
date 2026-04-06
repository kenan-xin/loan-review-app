import { NextResponse } from "next/server"
import { createJob, getJob, completeJob, failJob } from "@/lib/job-store"
import { logger } from "@/lib/logger"

export const maxDuration = 1800

const EXTERNAL_API_URL = "https://dev-genie.001.gs/smart-api/loan-review"
const EXTERNAL_API_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export async function POST(request: Request): Promise<NextResponse> {
  const context = "POST /api/loan-review"

  try {
    const formData = await request.formData()
    const application = formData.get("application") as File | null
    const examples = formData.getAll("examples") as File[]

    if (!application) {
      logger.warn(context, "Missing application file")
      return NextResponse.json(
        { error: "Application file is required" },
        { status: 400 }
      )
    }

    const jobId = crypto.randomUUID()
    createJob(jobId)

    logger.info(context, "New job started", {
      jobId,
      applicationFile: application.name,
      exampleFiles: examples.length,
    })

    // Forward to external API in the background
    forwardToExternalApi(jobId, formData).catch((err) => {
      logger.error(context, "Unexpected error in background task", {
        jobId,
        error: String(err),
      })
    })

    return NextResponse.json({ jobId })
  } catch (err) {
    logger.error(context, "Failed to process request", { error: String(err) })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function forwardToExternalApi(
  jobId: string,
  formData: FormData
): Promise<void> {
  const context = "POST /api/loan-review"
  logger.info(context, "Forwarding to external API", {
    jobId,
    url: EXTERNAL_API_URL,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    EXTERNAL_API_TIMEOUT_MS
  )

  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const durationMs = Date.now() - (getJob(jobId)?.startedAt ?? Date.now())
    const durationMin = (durationMs / 60000).toFixed(1)

    if (!response.ok) {
      const body = await response.text().catch(() => "unable to read body")
      logger.error(context, "External API error", {
        jobId,
        status: response.status,
        duration: `${durationMin}m`,
        body,
      })
      failJob(jobId, `External API returned status ${response.status}`)
      return
    }

    const result = await response.json()
    logger.info(context, "External API responded", {
      jobId,
      status: response.status,
      duration: `${durationMin}m`,
    })
    completeJob(jobId, result)
  } catch (err) {
    clearTimeout(timeoutId)

    if (controller.signal.aborted) {
      logger.error(context, "External API timeout", { jobId })
      failJob(jobId, "Request timed out after 30 minutes")
    } else {
      logger.error(context, "External API fetch failed", {
        jobId,
        error: String(err),
      })
      failJob(jobId, `Failed to reach external API: ${String(err)}`)
    }
  }
}
