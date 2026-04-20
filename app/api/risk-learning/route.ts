import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export const maxDuration = 300

const EXTERNAL_API_URL = "https://dev-genie.001.gs/smart-api/risk_learning_agent_s2"
const EXTERNAL_API_TIMEOUT_MS = 10 * 60 * 1000

export async function POST(request: Request): Promise<NextResponse> {
  const context = "POST /api/risk-learning"

  try {
    const formData = await request.formData()
    const doc = formData.get("doc")

    if (!doc || !(doc instanceof File)) {
      logger.warn(context, "No file provided")
      return NextResponse.json(
        { success: false, error: "A file is required" },
        { status: 400 }
      )
    }

    logger.info(context, "Forwarding to external API", { file: doc.name })

    const outgoing = new FormData()
    outgoing.append("doc", doc)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(EXTERNAL_API_URL, {
        method: "POST",
        body: outgoing,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "unable to read body")
      logger.error(context, "External API error", {
        status: response.status,
        body,
      })
      return NextResponse.json(
        { success: false, error: `External API returned ${response.status}` },
        { status: 502 }
      )
    }

    const completedOutput = await consumeSSE(response)

    if (!completedOutput) {
      logger.error(context, "SSE stream ended without completed event")
      return NextResponse.json(
        { success: false, error: "External API stream ended without result" },
        { status: 502 }
      )
    }

    logger.info(context, "External API responded", {
      body: JSON.stringify(completedOutput).slice(0, 2000),
    })
    return NextResponse.json({ success: true, ...completedOutput })
  } catch (err) {
    logger.error(context, "Failed to process request", { error: String(err) })
    return NextResponse.json(
      { success: false, error: "External API request failed" },
      { status: 502 }
    )
  }
}

async function consumeSSE(response: Response): Promise<Record<string, unknown> | null> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr) continue

        let event: Record<string, unknown>
        try {
          event = JSON.parse(jsonStr)
        } catch {
          continue
        }

        const context = "POST /api/risk-learning"
        logger.info(context, "SSE event", {
          eventType: event.eventType,
          event: JSON.stringify(event).slice(0, 4000),
        })

        if (event.eventType === "completed") {
          return event.output as Record<string, unknown>
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return null
}
