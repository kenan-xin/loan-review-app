"use client"

import { useState, useRef, useEffect } from "react"
import { LayoutGrid } from "lucide-react"
import { useLoanReviewStore } from "@/store/loan-review"
import type { ResultLayout } from "./results/types"

const LAYOUT_OPTIONS: Array<{ value: ResultLayout; label: string }> = [
  { value: "sidebar", label: "Layout A" },
  { value: "briefing", label: "Layout B" },
  { value: "ledger", label: "Layout C" },
]

export function LayoutSwitcher() {
  const { resultLayout, setResultLayout } = useLoanReviewStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const current = LAYOUT_OPTIONS.find((o) => o.value === resultLayout)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Switch layout (current: ${current?.label ?? "Layout A"})`}
      >
        <LayoutGrid className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-sm">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setResultLayout(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors ${
                resultLayout === opt.value
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {opt.label}
              {resultLayout === opt.value && (
                <svg
                  className="ml-auto size-3.5 text-muted-foreground"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8.5 6.5 12 13 4" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
