"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Maximize2, Minimize2, RotateCcw, X } from "lucide-react"
import { cn } from "@/lib/utils"
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
  readonly isOpen: boolean
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
  if (decision.required_conditions && decision.required_conditions.length > 0) {
    suggestions.push({
      badge: "UNVERIFIABLE",
      badgeColor: "text-slate-500",
      text: "What are the unverifiable risks?",
    })
  }

  return suggestions
}

export function ChatPanel({ result, isOpen, onClose }: ChatPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [clickedSuggestions, setClickedSuggestions] = useState<Set<string>>(
    new Set()
  )
  const clientSessionId = useRef(crypto.randomUUID())
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, setMessages, stop } = useChat({
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

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: status === "streaming" ? "auto" : "smooth",
    })
  }, [messages, status])

  const getChatBody = () => ({
    caData: result.caData,
    evaluationReport,
    clientSessionId: clientSessionId.current,
  })

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return
    sendMessage({ text: message.text }, { body: getChatBody() })
  }

  const handleSuggestion = (text: string) => {
    setClickedSuggestions((prev) => new Set(prev).add(text))
    sendMessage({ text }, { body: getChatBody() })
  }

  const handleClearChat = () => {
    setMessages([])
    clientSessionId.current = crypto.randomUUID()
  }

  const handleRetry = () => {
    const lastUserMessage = messages.filter((m) => m.role === "user").pop()
    if (lastUserMessage) {
      const textPart = lastUserMessage.parts.find((p) => p.type === "text")
      const text = textPart && textPart.type === "text" ? textPart.text : ""
      if (text) {
        sendMessage({ text }, { body: getChatBody() })
      }
    }
  }

  // Escape key to close panel
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Ask AI chat panel"
      className={cn(
        "fixed z-50 flex flex-col bg-card transition-all duration-300 ease-in-out",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        isExpanded
          ? "top-0 right-0 h-full w-full border-l border-border shadow-[-2px_0_8px_rgba(0,0,0,0.06)] sm:w-[520px]"
          : "right-4 bottom-4 h-[50vh] w-full overflow-hidden rounded-none border-none shadow-none sm:h-[560px] sm:w-[480px] sm:rounded-lg sm:border sm:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-semibold tracking-wide">
            Ask about this review
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
              title="New chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close chat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages or empty state */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center px-4 py-6">
            <p className="mb-1 text-xs font-medium text-foreground">
              {groupName}
            </p>
            <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
              {result.evaluationSummary.total_fail} failures,{" "}
              {result.evaluationSummary.total_warning} warnings,{" "}
              {result.evaluationSummary.total_pass} passed
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSuggestion(s.text)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                >
                  <span
                    className={`shrink-0 font-mono text-[10px] font-bold ${s.badgeColor}`}
                  >
                    {s.badge}
                  </span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 p-4">
            {messages.map((message) => (
              <Message
                key={message.id}
                from={message.role}
                className={message.role === "user" ? "max-w-[80%]" : ""}
              >
                <MessageContent
                  className={
                    message.role === "user"
                      ? "rounded-lg bg-primary px-4 py-2.5 text-primary-foreground group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                      : "rounded-lg bg-muted px-4 py-2.5"
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
            {status === "streaming" && (
              <div className="flex items-center gap-1 px-4 py-2 text-xs text-muted-foreground">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 px-2 py-2 text-sm text-destructive">
                <p>Something went wrong.</p>
                <button
                  onClick={handleRetry}
                  className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold hover:bg-destructive/20"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-3 py-2.5">
        {messages.length > 0 &&
          suggestions.filter((s) => !clickedSuggestions.has(s.text)).length >
            0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions
                .filter((s) => !clickedSuggestions.has(s.text))
                .slice(0, 3)
                .map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestion(s.text)}
                    className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span
                      className={`shrink-0 font-mono text-[9px] font-bold ${s.badgeColor}`}
                    >
                      {s.badge}
                    </span>
                    {s.text}
                  </button>
                ))}
            </div>
          )}
        <PromptInputProvider>
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="Type a question..." />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit
                className="rounded-md"
                status={status}
                onStop={
                  status === "submitted" || status === "streaming"
                    ? stop
                    : undefined
                }
              />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  )
}
