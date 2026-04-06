import { NextResponse } from "next/server"
import { getJob } from "@/lib/job-store"
import { logger } from "@/lib/logger"

export async function GET(request: Request): Promise<NextResponse> {
  const context = "GET /api/loan-review/status"
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const job = getJob(jobId)

  if (!job) {
    logger.warn(context, "Job not found", { jobId })
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const elapsedSeconds = Math.floor((Date.now() - job.startedAt) / 1000)

  logger.info(context, "Status poll", {
    jobId,
    status: job.status,
    elapsedSeconds,
  })

  return NextResponse.json({
    status: job.status,
    result: job.result ?? null,
    error: job.error ?? null,
    elapsedSeconds,
  })
}
