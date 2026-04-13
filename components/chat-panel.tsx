"use client"

import { useMemo, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { X } from "lucide-react"
import type { SimulationResult } from "@/types/review"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"

interface ChatPanelProps {
  readonly result: SimulationResult
  readonly onClose: () => void
}

function getGroupName(caData: SimulationResult["caData"]): string {
  const basic = caData.A_basic_information
  if (basic && typeof basic === "object") {
    const info = basic as Record<string, unknown>
    return (
      (info.group_name as string) ??
      (info.Group_Name as string) ??
      "this applicant"
    )
  }
  return "this applicant"
}

function getSuggestions(
  result: SimulationResult
): { badge: string; badgeColor: string; text: string }[] {
  const suggestions: { badge: string; badgeColor: string; text: string }[] = []
  const summary = result.evaluationSummary
  const decision = result.evaluationDecision

  if (summary.total_fail > 0) {
    suggestions.push({
      badge: "FAIL",
      badgeColor: "text-red-500",
      text: "What are the key risk concerns?",
    })
  }
  if (summary.total_warning > 0) {
    suggestions.push({
      badge: "WARN",
      badgeColor: "text-amber-500",
      text: "Explain the main warning findings",
    })
  }
  if (summary.total_pass > 0) {
    suggestions.push({
      badge: "PASS",
      badgeColor: "text-emerald-500",
      text: "Summarise the overall decision",
    })
  }
  if (decision.required_conditions.length > 0) {
    suggestions.push({
      badge: "COND",
      badgeColor: "text-blue-500",
      text: "What conditions are required?",
    })
  }

  return suggestions
}

export function ChatPanel({ result, onClose }: ChatPanelProps) {
  const clientSessionId = useRef(crypto.randomUUID())
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  })

  const groupName = useMemo(() => getGroupName(result.caData), [result])
  const suggestions = useMemo(() => getSuggestions(result), [result])

  // Construct evaluationReport from store fields + metadata from caData
  const evaluationReport = useMemo(() => {
    const basic = result.caData.A_basic_information as Record<
      string,
      unknown
    > | null
    return {
      report_metadata: {
        ca_reference_no: (basic?.ca_reference_no as string) ?? "",
        group_name: (basic?.group_name as string) ?? "",
        borrower_names: (basic?.borrower_names as string[]) ?? [],
        application_type: (basic?.application_type as string) ?? "",
        evaluation_date: new Date().toISOString().split("T")[0],
      },
      evaluation_results: result.evaluationResults,
      summary: result.evaluationSummary,
      decision: result.evaluationDecision,
    }
  }, [result])

  const chatBody = useMemo(
    () => ({
      caData: result.caData,
      evaluationReport,
      clientSessionId: clientSessionId.current,
    }),
    [result, evaluationReport]
  )

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return
    sendMessage({ text: message.text }, { body: chatBody })
  }

  const handleSuggestion = (text: string) => {
    sendMessage({ text }, { body: chatBody })
  }

  return (
    <div className="flex h-[420px] w-[360px] flex-col overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-sm bg-primary" />
          <span className="text-xs font-semibold">Ask about this review</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Messages or empty state */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center px-3.5 py-5">
            <p className="mb-3.5 text-[11px] leading-relaxed text-muted-foreground">
              Reviewing <strong className="text-foreground">{groupName}</strong>{" "}
              — {result.evaluationSummary.total_fail} failures,{" "}
              {result.evaluationSummary.total_warning} warnings found.
            </p>
            <div className="flex flex-col gap-1">
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSuggestion(s.text)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-[7px] text-left text-[11px] text-foreground transition-colors hover:bg-muted"
                >
                  <span
                    className={`font-mono text-[9px] font-bold ${s.badgeColor}`}
                  >
                    {s.badge}
                  </span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3.5">
            {messages.map((message) => (
              <Message
                key={message.id}
                from={message.role}
                className={
                  message.role === "user" ? "max-w-[80%]" : "max-w-[90%]"
                }
              >
                <MessageContent
                  className={
                    message.role === "user"
                      ? "bg-primary text-primary-foreground group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                      : "bg-muted"
                  }
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-${i}`}>
                          {part.text}
                        </MessageResponse>
                      )
                    }
                    return null
                  })}
                </MessageContent>
              </Message>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t px-2.5 py-2">
        <PromptInputProvider>
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="Type a question..." />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit className="rounded-md" status={status} />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  )
}
