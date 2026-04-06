import type { Job } from "@/types/review"
import { logger } from "@/lib/logger"

const jobs = new Map<string, Job>()

export function createJob(jobId: string): void {
  jobs.set(jobId, {
    status: "processing",
    startedAt: Date.now(),
  })
  logger.info("job-store", "Job created", { jobId, totalJobs: jobs.size })
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId)
}

export function completeJob(jobId: string, result: unknown): void {
  const job = jobs.get(jobId)
  if (!job) {
    logger.warn("job-store", "Attempted to complete unknown job", { jobId })
    return
  }
  job.status = "complete"
  job.result = result
  const durationMs = Date.now() - job.startedAt
  logger.info("job-store", "Job completed", { jobId, durationMs })
}

export function failJob(jobId: string, error: string): void {
  const job = jobs.get(jobId)
  if (!job) {
    logger.warn("job-store", "Attempted to fail unknown job", { jobId })
    return
  }
  job.status = "error"
  job.error = error
  const durationMs = Date.now() - job.startedAt
  logger.error("job-store", "Job failed", { jobId, error, durationMs })
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId)
  logger.info("job-store", "Job deleted", { jobId })
}
