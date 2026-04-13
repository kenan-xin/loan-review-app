"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SimulationResult } from "@/types/review"
import { ChatPanel } from "@/components/chat-panel"

interface ChatBubbleProps {
  readonly result: SimulationResult
}

export function ChatBubble({ result }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-6 bottom-6 z-50 flex cursor-pointer items-center gap-2.5 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-[opacity,shadow] duration-150 hover:shadow-xl hover:shadow-primary/30",
          isOpen && "pointer-events-none opacity-0"
        )}
        aria-hidden={isOpen}
      >
        <MessageCircle className="h-[18px] w-[18px]" />
        <span className="text-xs tracking-wide">Ask AI</span>
      </button>

      <ChatPanel
        result={result}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
