# Chat Bubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating chat bubble to the results page that lets users ask questions about their loan review via a streaming chatbot API.

**Architecture:** Client uses `useChat` from `@ai-sdk/react` with AI SDK Elements components. A Next.js API route proxies requests to an external SSE chatbot API, translating its custom SSE format into AI SDK's `UIMessageStream`. Session continuity uses a client-generated `clientSessionId` mapped server-side to the external API's `sessionUUID`.

**Tech Stack:** Next.js App Router, AI SDK (`ai` + `@ai-sdk/react`), AI SDK Elements (conversation, message, prompt-input), Tailwind CSS v4

---

### Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install AI SDK packages**

```bash
pnpm add ai @ai-sdk/react
```

- [ ] **Step 2: Install AI SDK Elements components**

```bash
pnpm dlx ai-elements@latest add conversation message prompt-input
```

- [ ] **Step 3: Verify installation**

```bash
ls components/ai-elements/conversation.tsx components/ai-elements/message.tsx components/ai-elements/prompt-input.tsx
```

Expected: three files listed

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml components/ai-elements/
git commit -m "chore: install ai sdk and ai elements components"
```

---

### Task 2: API Route — SSE Proxy

**Files:**

- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Create the API route**

```ts
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

            // On completed, use authoritative full answer
            if (
              event.status === "completed" &&
              typeof answer === "string" &&
              answer
            ) {
              // The completed answer replaces any streamed deltas
              // We can't "replace" text-deltas already sent, so we
              // just let the stream end. The last text-delta from
              // completed will be close enough.
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
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build passes (may fail if AI Elements components have issues — fix in next step)

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add SSE proxy API route for chatbot"
```

---

### Task 3: ChatPanel Component

**Files:**

- Create: `components/chat-panel.tsx`

- [ ] **Step 1: Create the chat panel**

```tsx
"use client"

import { useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { X } from "lucide-react"
import type { SimulationResult } from "@/types/review"
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation"
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

  const summaryText = useMemo(() => {
    const s = result.evaluationSummary
    const parts: string[] = []
    if (s.total_fail > 0)
      parts.push(`${s.total_fail} failure${s.total_fail > 1 ? "s" : ""}`)
    if (s.total_warning > 0)
      parts.push(`${s.total_warning} warning${s.total_warning > 1 ? "s" : ""}`)
    const desc = parts.length > 0 ? parts.join(", ") : "no issues"
    return `Reviewing ${groupName} — ${desc} found.`
  }, [result, groupName])

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

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return
    sendMessage(
      { text: message.text },
      {
        body: {
          caData: result.caData,
          evaluationReport,
          clientSessionId: clientSessionId.current,
        },
      }
    )
  }

  const handleSuggestion = (text: string) => {
    sendMessage(
      { text },
      {
        body: {
          caData: result.caData,
          evaluationReport,
          clientSessionId: clientSessionId.current,
        },
      }
    )
  }

  const isLoading = status === "streaming" || status === "submitted"

  return (
    <div className="flex h-[420px] w-[360px] flex-col overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
          <div className="p-3.5">
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
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
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build passes (fix any type issues)

- [ ] **Step 3: Commit**

```bash
git add components/chat-panel.tsx
git commit -m "feat: add chat panel with AI SDK Elements"
```

---

### Task 4: ChatBubble Container Component

**Files:**

- Create: `components/chat-bubble.tsx`

- [ ] **Step 1: Create the chat bubble container**

```tsx
"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import type { SimulationResult } from "@/types/review"
import { ChatPanel } from "@/components/chat-panel"

interface ChatBubbleProps {
  readonly result: SimulationResult
}

export function ChatBubble({ result }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isOpen) {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <ChatPanel result={result} onClose={() => setIsOpen(false)} />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed right-4 bottom-4 z-50 flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-muted"
    >
      Ask about this review
      <ArrowRight className="h-3 w-3" />
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat-bubble.tsx
git commit -m "feat: add floating chat bubble container"
```

---

### Task 5: Integrate into Results Page

**Files:**

- Modify: `app/page.tsx`

- [ ] **Step 1: Add ChatBubble to the wizard page**

Add import at the top of `app/page.tsx` (after existing imports):

```ts
import { ChatBubble } from "@/components/chat-bubble"
```

Add the ChatBubble render inside the `{step === 3 && result && (` block in `app/page.tsx`, right after the `<ResultsStep>`:

```tsx
{
  step === 3 && result && (
    <>
      <ResultsStep result={result} onStartNew={reset} />
      <ChatBubble result={result} />
    </>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build passes

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: render chat bubble on results page"
```

---

### Task 6: Style Chat Messages

**Files:**

- Modify: `components/chat-panel.tsx`
- Possibly modify: `components/ai-elements/message.tsx` (if styling props are limited)

- [ ] **Step 1: Inspect AI Elements Message component for styling hooks**

Read `components/ai-elements/message.tsx` to check if `Message`, `MessageContent`, and `MessageResponse` accept `className` props for customization.

- [ ] **Step 2: Apply chat bubble styles**

Based on the spec design:

- Bot messages: `bg-muted rounded-lg` with left alignment
- User messages: `bg-primary text-primary-foreground rounded-lg` with right alignment
- No avatars

If `Message` accepts a `className`, apply per-role styling. If not, wrap with styled divs. The key patterns from the spec:

- Bot (assistant) messages: `bg-muted rounded-lg` padding, max-width 90%, left-aligned
- User messages: `bg-primary text-primary-foreground rounded-lg`, max-width 80%, right-aligned
- Input area: `border rounded-md` with primary send button

Update `ChatPanel`'s message rendering and input area styling to match the spec design mockups.

- [ ] **Step 3: Verify build and visual check**

```bash
pnpm build
```

Expected: build passes

- [ ] **Step 4: Commit**

```bash
git add components/chat-panel.tsx
git commit -m "feat: style chat messages to match spec design"
```

---

### Task 7: Mobile Responsiveness

**Files:**

- Modify: `components/chat-bubble.tsx`
- Modify: `components/chat-panel.tsx`

- [ ] **Step 1: Add responsive sizing to ChatBubble**

On small screens (< 640px), the panel should be full-width with rounded corners only on top. Update `ChatBubble`:

- Panel: `w-[calc(100vw-2rem)] sm:w-[360px]` and position at `bottom-0 sm:bottom-4`
- Height: `h-[50vh] sm:h-[420px]`

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build passes

- [ ] **Step 3: Commit**

```bash
git add components/chat-bubble.tsx components/chat-panel.tsx
git commit -m "feat: add mobile responsive chat panel"
```

---

### Task 8: Final Build and Manual Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: clean build, no errors or warnings

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no type errors

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: no lint errors

- [ ] **Step 4: Run formatter**

```bash
pnpm format
```

- [ ] **Step 5: Commit formatting**

```bash
git add -A
git commit -m "chore: format chat bubble files"
```

- [ ] **Step 6: Manual verification checklist**

1. Navigate to results page → floating trigger visible bottom-right
2. Click trigger → panel opens with empty state showing review summary + suggestion prompts with FAIL/WARN/PASS badges
3. Click a suggestion → streaming response renders markdown (bold, lists, etc.)
4. Type a follow-up question → continues conversation with same session
5. Close panel → trigger reappears
6. Open panel again → fresh session, previous messages gone
7. Dark mode → all colors match theme (primary, muted, border tokens)
8. Mobile viewport → panel adapts to full width
