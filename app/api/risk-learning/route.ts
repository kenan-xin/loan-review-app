import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const EXTERNAL_API_URL = "https://dev-genie.001.gs/smart-api/risk_learning"

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

    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      body: outgoing,
    })

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

    const result = await response.json()
    logger.info(context, "External API responded", {
      status: response.status,
      body: JSON.stringify(result).slice(0, 2000),
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    logger.error(context, "Failed to process request", { error: String(err) })
    return NextResponse.json(
      { success: false, error: "External API request failed" },
      { status: 502 }
    )
  }
}
