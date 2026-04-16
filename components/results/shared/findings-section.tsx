"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

type DotColor = "red" | "green" | "amber" | "grey"

const DOT_COLORS: Record<DotColor, string> = {
  red: "bg-red-400",
  green: "bg-emerald-400",
  amber: "bg-amber-300",
  grey: "bg-slate-400",
}

interface FindingsSectionProps {
  readonly title: string
  readonly items: string[]
  readonly dotColor: DotColor
  readonly defaultOpen?: boolean
}

export function FindingsSection({
  title,
  items,
  dotColor,
  defaultOpen = false,
}: FindingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-xs font-medium text-foreground">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {items.length}
          </span>
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 px-4 pb-3">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs leading-relaxed"
              >
                <span
                  className={`mt-1.5 size-[5px] shrink-0 rounded-full ${DOT_COLORS[dotColor]}`}
                />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
