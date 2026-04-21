import { createWriteStream, readdirSync, statSync, unlinkSync } from "node:fs"
import path from "node:path"

import cors from "cors"
import express from "express"
import multer from "multer"

import { logger } from "./logger.js"

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

const DUMP_DIR = "/tmp"
const DUMP_PREFIX = "sse-"
const DUMP_KEEP = 10
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL ?? "https://dev-genie.001.gs/smart-api/reviewer_v2"

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
}

app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? "*", credentials: false }))

function pruneOldDumps(context: string): void {
  try {
    const entries = readdirSync(DUMP_DIR)
      .filter((f) => f.startsWith(DUMP_PREFIX) && f.endsWith(".jsonl"))
      .map((f) => {
        const full = path.join(DUMP_DIR, f)
        return { full, mtime: statSync(full).mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)

    for (const old of entries.slice(DUMP_KEEP - 1)) {
      try { unlinkSync(old.full) } catch { /* best-effort */ }
    }
  } catch (err) {
    logger.warn(context, "Dump prune failed", { error: String(err) })
  }
}

interface LogContext {
  context: string
  startedAt: number
  file: string
  dumpPath: string
}

async function logSseFrames(stream: ReadableStream<Uint8Array>, ctx: LogContext): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: false })
  let buf = ""
  let eventCount = 0
  let heartbeatCount = 0
  let firstByte = true
  const dump = createWriteStream(ctx.dumpPath, { flags: "a" })

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (firstByte && !done) {
        firstByte = false
        logger.info(ctx.context, "Upstream stream opened", {
          ms: Date.now() - ctx.startedAt,
        })
      }

      if (done) {
        logger.info(ctx.context, "Upstream stream closed", {
          totalEvents: eventCount,
          heartbeats: heartbeatCount,
          durationMs: Date.now() - ctx.startedAt,
        })
        break
      }

      buf += decoder.decode(value, { stream: true })
      const frames = buf.split("\n\n")
      buf = frames.pop() ?? ""

      for (const frame of frames) {
        if (!frame.trim()) continue
        const lines = frame.split("\n")

        for (const line of lines) {
          if (line.startsWith(":")) {
            heartbeatCount++
            if (heartbeatCount % 10 === 0) {
              logger.info(ctx.context, "SSE heartbeat", {
                heartbeatCount,
                ms: Date.now() - ctx.startedAt,
              })
            }
            continue
          }

          if (line.startsWith("retry:")) {
            logger.info(ctx.context, "SSE retry directive", {
              value: line.slice(6).trim(),
            })
            continue
          }

          if (!line.startsWith("data: ")) continue

          eventCount++
          const jsonStr = line.slice(6)
          let parsed: Record<string, unknown>
          try {
            parsed = JSON.parse(jsonStr)
          } catch {
            logger.warn(ctx.context, "SSE malformed data frame", {
              preview: jsonStr.slice(0, 200),
              eventCount,
              ms: Date.now() - ctx.startedAt,
            })
            dump.write(JSON.stringify({ t: Date.now() - ctx.startedAt, eventCount, malformed: jsonStr }) + "\n")
            continue
          }

          const nodeID = String(parsed.nodeID ?? "")
          const status = String(parsed.status ?? "")
          const meta: Record<string, unknown> = {
            nodeID,
            status,
            eventCount,
            ms: Date.now() - ctx.startedAt,
          }

          if (parsed.output) {
            const outputStr = JSON.stringify(parsed.output)
            if (outputStr.length > 500) {
              const keys = Object.keys(parsed.output as object)
              meta.outputKeys = keys.join(",")
              meta.outputBytes = outputStr.length
            }
          }

          logger.info(ctx.context, "SSE event", meta)
          dump.write(JSON.stringify({ t: Date.now() - ctx.startedAt, eventCount, event: parsed }) + "\n")
        }
      }
    }
  } catch (err) {
    logger.error(ctx.context, "Upstream stream error", {
      error: err instanceof Error ? err.stack ?? err.message : String(err),
      ms: Date.now() - ctx.startedAt,
    })
  } finally {
    reader.releaseLock()
    dump.end()
  }
}

app.get("/healthz", (_req, res) => {
  res.send("ok")
})

app.post("/api/loan-review-v2", upload.single("ca"), async (req, res) => {
  const context = "POST /api/loan-review-v2"

  try {
    const file = req.file
    if (!file) {
      logger.warn(context, "Missing ca file")
      res.status(400).json({ error: "CA file is required" })
      return
    }

    const originalName = file.originalname ?? "upload"
    logger.info(context, "Proxying SSE request", { file: originalName })

    const upstream = new FormData()
    upstream.append("ca", new Blob([new Uint8Array(file.buffer)]), originalName)

    const abortCtrl = new AbortController()
    let streaming = false
    req.on("close", () => {
      if (streaming) {
        logger.info(context, "Client disconnected, aborting upstream")
        abortCtrl.abort()
      }
    })

    const t0 = Date.now()
    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      body: upstream,
      signal: abortCtrl.signal,
    })

    logger.info(context, "Upstream responded", {
      status: response.status,
      contentType: response.headers.get("content-type"),
      ms: Date.now() - t0,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "unable to read body")
      logger.error(context, "Upstream error", { status: response.status, body })
      res.status(response.status).json({ error: `Upstream returned ${response.status}` })
      return
    }

    if (!response.body) {
      logger.error(context, "Upstream returned no body")
      res.status(502).json({ error: "Upstream returned empty response" })
      return
    }

    res.writeHead(200, SSE_HEADERS)
    streaming = true

    pruneOldDumps(context)
    const dumpPath = path.join(
      DUMP_DIR,
      `sse-${new Date().toISOString().replace(/[:.]/g, "-")}-${originalName.replace(/[^\w.-]/g, "_")}.jsonl`
    )
    logger.info(context, "Dumping SSE events", { dumpPath })

    const [logBranch, clientBranch] = response.body.tee()
    logSseFrames(logBranch, { context, startedAt: t0, file: originalName, dumpPath }).catch(
      (err) => logger.error(context, "log-drain crashed", { error: err instanceof Error ? err.stack ?? err.message : String(err) })
    )

    const reader = clientBranch.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          logger.info(context, "Client stream completed normally")
          break
        }
        res.write(value)
      }
    } catch (err) {
      logger.error(context, "Upstream stream error (client branch)", {
        error: err instanceof Error ? err.stack ?? err.message : String(err),
        ms: Date.now() - t0,
      })
    } finally {
      reader.releaseLock()
      res.end()
    }
  } catch (err) {
    logger.error(context, "Failed to process request", { error: err instanceof Error ? err.stack ?? err.message : String(err) })
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" })
    }
  }
})

const PORT = parseInt(process.env.PORT ?? "8080", 10)
app.listen(PORT, () => {
  logger.info("server", `Listening on :${PORT}`)
})
