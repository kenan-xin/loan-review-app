# Floating Chat Bubble for Results Page

## Context

The results page displays AI-generated loan review data (credit analysis + evaluation report). Users need a way to ask questions about these results. A floating chat bubble provides conversational access to a chatbot API that has the full review data in context via `customFields`.

## API

**Endpoint:** `POST https://dev-genie.001.gs/public-api/v2/workflow/chatbot/chats`

**Payload:**

```ts
{
  uuid: "e43f866d-3b1b-43f8-b776-7db8a615a94e",
  userPrompt: string,
  sessionUUID: string,
  language: "en-US",
  documentIDs: [],
  imageIDs: [],
  audioIDs: [],
  customFields: { reviewData: SimulationResult }
}
```

**Response:** SSE stream. Each line is `data: {JSON}`. Key fields:

- `answer` — **concatenable deltas**. Non-empty fragments connect end-to-start (e.g. `"mistake"` → `"! \n\n"`). Concatenate all non-empty `answer` values for progressive streaming display. Empty `answer` during processing = status update, skip it.
- **Important:** The concatenated deltas may differ slightly from the `completed` event's `answer` (the LLM regenerates). Strategy: stream concatenated deltas for real-time display, use the `completed` event's answer as authoritative fallback (if no deltas were received, or to replace the final text).
- `status` — `"initiating"` → `"processing"` → `"completed"`. Use `completed` to know the response is done.
- `uuid` — returned in every SSE event. This IS the `sessionUUID` for conversation continuity. First request: `sessionUUID: ""` in payload. Capture `uuid` from the first response event, send it as `sessionUUID` in subsequent requests.
- **Answer format:** Full markdown — `**bold**`, numbered lists, fenced code blocks (````xml), inline code, etc. Must be rendered as markdown.

## Architecture

```
ResultsStep
  └─ ChatBubble (fixed bottom-right)
       ├─ useChat() from @ai-sdk/react
       ├─ POST /api/chat (proxy)
       │    ├─ Receives { messages, reviewData, sessionUUID } from useChat body
       │    ├─ Calls external SSE API with customFields = serialized SimulationResult
       │    ├─ Concatenates non-empty answer fragments → progressive streaming
       │    ├─ Captures `uuid` from first SSE event → returns as sessionUUID to client
       │    └─ Translates to UIMessageStream response
       └─ Renders messages via AI SDK Elements components
```

**Why a server proxy:** The external API uses a custom SSE format, not AI SDK's standard `UIMessageStream`. The proxy translates between the two.

## Components

### ChatBubble (`components/chat-bubble.tsx`)

- Client component
- Manages open/close state
- Fixed position bottom-right
- Passes `SimulationResult` to the API route via `useChat` body

### ChatPanel (`components/chat-panel.tsx`)

- Uses AI SDK Elements: `Conversation`, `ConversationContent`, `Message`, `MessageContent`, `MessageResponse`, `PromptInput`, `PromptInputTextarea`, `PromptInputSubmit`
- Renders markdown bot responses via `MessageResponse`
- Contextual empty state with FAIL/WARN/PASS-prefixed suggestion prompts
- Session management: fresh `sessionUUID` per visit (component state)

### API Route (`app/api/chat/route.ts`)

- Receives `POST` with `{ messages, reviewData, sessionUUID }` from useChat body
- Extracts last user message as `userPrompt`
- Calls external chatbot API with `sessionUUID` for continuity, streams response
- Parses SSE events, concatenates non-empty `answer` fragments for progressive streaming
- Emits concatenated text incrementally as AI SDK stream text parts for real-time display
- On `status: "completed"`, uses the completed event's `answer` as the authoritative final text (replaces any minor differences from streamed deltas)
- Sends fixed `uuid` (workflow ID `e43f866d-3b1b-43f8-b776-7db8a615a94e`) in every request
- Captures `uuid` from the first SSE event body, returns it to the client as the sessionUUID
- Client sends sessionUUID back in subsequent requests for conversation continuity
- Emits AI SDK `UIMessageStream` format back to client

## Design

### Trigger (collapsed)

- Text CTA: "Ask about this review →" in a bordered card with subtle shadow
- Positioned bottom-right of the results area

### Panel (expanded)

- `rounded-lg border` panel matching existing card patterns
- Header: `border-bottom` with primary dot indicator + "Ask about this review" title + close button
- No `bg-primary` header — panel is a tool, not a branded widget
- No bot avatar — clean left/right message alignment
- Bot messages: `bg-muted rounded-8px`, renders markdown via `MessageResponse`
- User messages: `bg-primary text-primary-foreground rounded-8px`
- Empty state: review summary ("Reviewing RH Group — 3 failures, 5 warnings") + contextual suggestion prompts with FAIL/WARN/PASS badges
- Input: `border rounded-6px` with primary-colored send button `rounded-6px`
- Minimal shadow: `0 1px 2px`

### AI SDK Elements Components to Install

- `conversation` — scrollable message container
- `message` — chat bubbles
- `prompt-input` — input field with submit button

## Session Management

- Fresh session per page visit (no persistence across refreshes)
- `uuid` in payload is always the fixed workflow ID: `e43f866d-3b1b-43f8-b776-7db8a615a94e`
- First request: `sessionUUID: ""`. The `uuid` field in the SSE response body IS the sessionUUID.
- Client captures response `uuid`, stores in component state, sends as `sessionUUID` in subsequent requests
- No server-side session storage needed — client owns the session UUID

## Data Flow

1. User opens chat bubble on results page
2. Zustand store has `SimulationResult` with `caData`, `evaluationResults`, `evaluationSummary`, `evaluationDecision`
3. `ChatBubble` reads `result` from store, passes to `ChatPanel`
4. `ChatPanel` uses `useChat({ body: { reviewData: result } })` — review data sent with every request but invisible to user
5. First request: `sessionUUID: ""`. SSE response `uuid` field → client captures and stores as sessionUUID
6. Subsequent requests: client sends stored sessionUUID in the `sessionUUID` payload field
7. API route sends fixed workflow `uuid` + `sessionUUID` + `customFields` to external API
8. External API returns SSE with concatenable `answer` fragments
9. API route concatenates fragments, translates to AI SDK stream format, client renders incrementally

## Files to Create/Modify

- `components/chat-bubble.tsx` — new, floating bubble container
- `components/chat-panel.tsx` — new, chat UI with AI SDK Elements
- `components/ai-elements/` — new, installed via `npx ai-elements@latest`
- `app/api/chat/route.ts` — new, SSE proxy to external chatbot API
- `app/page.tsx` — modify, render `ChatBubble` when step === 3
- `package.json` — modify, add `ai` and `@ai-sdk/react` dependencies (not currently installed)

## Verification

1. `pnpm build` passes with no errors
2. Navigate to results page → floating trigger visible
3. Click trigger → panel opens with empty state showing review summary + suggestions
4. Click suggestion or type message → streaming response renders markdown
5. Send follow-up → continues conversation with same session
6. Refresh page → new session, previous conversation gone
7. Dark mode → all colors match theme
8. Mobile → panel adapts (full-width on small screens)
