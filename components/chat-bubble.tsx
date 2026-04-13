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
