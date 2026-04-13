import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  UIMessage,
} from "ai"

const WORKFLOW_UUID = "e43f866d-3b1b-43f8-b776-7db8a615a94e"
const API_URL = "https://dev-genie.001.gs/public-api/v2/workflow/chatbot/chats"

// In-memory session mapping: clientSessionId -> external sessionUUID
const sessionMap = new Map<string, string>()

export async function POST(req: Request) {
  const body = await req.json()
  const {
    messages,
    caData,
    evaluationReport,
    clientSessionId,
  }: {
    messages: UIMessage[]
    caData: unknown
    evaluationReport: unknown
    clientSessionId: string
  } = body

  // Extract last user message as prompt
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
  const userPrompt =
    lastUserMsg?.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""

  // Get or create session UUID
  let sessionUUID = sessionMap.get(clientSessionId) ?? ""

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: WORKFLOW_UUID,
          userPrompt,
          sessionUUID,
          language: "en-US",
          documentIDs: [],
          imageIDs: [],
          audioIDs: [],
          customFields: {
            caData: JSON.stringify(caData),
            evaluationReport: JSON.stringify(evaluationReport),
          },
        }),
      })

      if (!res.ok || !res.body) {
        writer.write({
          type: "text-start",
          id: "error-text",
        })
        writer.write({
          type: "text-delta",
          id: "error-text",
          delta: "Sorry, something went wrong. Please try again.",
        })
        writer.write({ type: "text-end", id: "error-text" })
        return
      }

      const textId = "response-text"
      let capturedSessionUUID = ""

      writer.write({ type: "text-start", id: textId })

      const reader = res.body.getReader()
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

            // Capture session UUID from first event
            if (!capturedSessionUUID && typeof event.uuid === "string") {
              capturedSessionUUID = event.uuid
              if (clientSessionId && capturedSessionUUID) {
                sessionMap.set(clientSessionId, capturedSessionUUID)
              }
            }

            // Stream non-empty answer deltas
            const answer = event.answer as string | undefined
            if (answer) {
              writer.write({ type: "text-delta", id: textId, delta: answer })
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      writer.write({ type: "text-end", id: textId })
    },
    onError: (error) =>
      error instanceof Error ? error.message : "An error occurred",
  })

  return createUIMessageStreamResponse({ stream })
}
