import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const EXTERNAL_API_URL = "https://dev-genie.001.gs/smart-api/risk_learning"

export async function POST(request: Request): Promise<NextResponse> {
  const context = "POST /api/risk-learning"

  try {
    const formData = await request.formData()
    const files = formData.getAll("files")

    if (!files || files.length === 0) {
      logger.warn(context, "No files provided")
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      )
    }

    logger.info(context, "Forwarding to external API", {
      fileCount: files.length,
    })

    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "unable to read body")
      logger.error(context, "External API error", {
        status: response.status,
        body,
      })
      return NextResponse.json(
        { error: "External API request failed" },
        { status: 502 }
      )
    }

    const result = await response.json()
    logger.info(context, "External API responded", {
      status: response.status,
    })
    return NextResponse.json(result)
  } catch (err) {
    logger.error(context, "Failed to process request", { error: String(err) })
    return NextResponse.json(
      { error: "External API request failed" },
      { status: 502 }
    )
  }
}
