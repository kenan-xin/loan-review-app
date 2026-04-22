"use client"

import { useId, useState } from "react"
import { Cell, Pie, PieChart, Tooltip } from "recharts"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"

type RiskLevel = "high" | "medium" | "low"

interface RiskMeterProps {
  readonly fail: number
  readonly warn: number
  readonly pass: number
  readonly missing: number
  readonly size?: "sm" | "md"
}

const RISK_LEVEL_STYLES: Record<RiskLevel, { label: string; className: string }> = {
  high: { label: "HIGH RISK", className: "fill-red-500 dark:fill-red-400" },
  medium: { label: "MED RISK", className: "fill-amber-500 dark:fill-amber-400" },
  low: { label: "LOW RISK", className: "fill-emerald-500 dark:fill-emerald-400" },
}

function deriveRiskLevel(fail: number, total: number): RiskLevel {
  if (total === 0) return "low"
  const ratio = fail / total
  if (ratio >= 0.3) return "high"
  if (ratio >= 0.1) return "medium"
  return "low"
}

const SIZE_CONFIG = {
  sm: { width: 140, height: 140, outerRadius: 56, innerRadius: 38, labelY: -6, subY: 8 },
  md: { width: 190, height: 190, outerRadius: 76, innerRadius: 52, labelY: -6, subY: 10 },
} as const

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { total: number; fill: string } }>
}) {
  if (!active || !payload?.length) return null
  const { name, value, payload: data } = payload[0]
  const pct = data.total > 0 ? Math.round((value / data.total) * 100) : 0
  return (
    <div className="rounded-lg border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
      <span className="font-medium">{name}</span>: {value} ({pct}%)
    </div>
  )
}

function RiskLevelInfo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative mt-1">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Risk level calculation explanation"
        aria-expanded={open}
      >
        <Info className="size-3" />
        <span>How is this calculated?</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2.5 text-[11px] leading-relaxed text-popover-foreground shadow-lg">
          <p className="font-medium">Risk level is based on the <span className="text-red-500 dark:text-red-400">fail ratio</span>:</p>
          <ul className="mt-1.5 space-y-1">
            <li><span className="font-medium text-red-500 dark:text-red-400">High</span> — fail ratio ≥ 30%</li>
            <li><span className="font-medium text-amber-500 dark:text-amber-400">Medium</span> — fail ratio ≥ 10%</li>
            <li><span className="font-medium text-emerald-500 dark:text-emerald-400">Low</span> — fail ratio &lt; 10%</li>
          </ul>
          <p className="mt-1.5 text-muted-foreground">
            Fail ratio = failed checks ÷ total checks
          </p>
        </div>
      )}
    </div>
  )
}

export function RiskMeter({
  fail,
  warn,
  pass,
  missing,
  size = "md",
}: RiskMeterProps) {
  const chartId = useId()
  const total = fail + warn + pass + missing
  const config = SIZE_CONFIG[size]
  const riskLevel = deriveRiskLevel(fail, total)
  const levelStyle = RISK_LEVEL_STYLES[riskLevel]

  const data = [
    { name: "Fail", value: fail, total },
    { name: "Warn", value: warn, total },
    { name: "Pass", value: pass, total },
    { name: "Unverifiable", value: missing, total },
  ].filter((d) => d.value > 0)

  const ariaLabel = [
    `Risk level: ${levelStyle.label}`,
    `Fail: ${fail}`,
    `Warn: ${warn}`,
    `Pass: ${pass}`,
    `Unverifiable: ${missing}`,
    `Total: ${total}`,
  ].join(". ")

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ width: config.width, height: config.height }}
      >
        No data
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Accessible table for screen readers */}
      <table className="sr-only">
        <caption>Risk evaluation summary</caption>
        <thead>
          <tr>
            <th>Category</th><th>Count</th><th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.name}>
              <td>{d.name}</td>
              <td>{d.value}</td>
              <td>{Math.round((d.value / total) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        role="img"
        aria-label={ariaLabel}
        aria-describedby={`chart-desc-${chartId}`}
      >
        <span id={`chart-desc-${chartId}`} className="sr-only">
          Donut chart showing evaluation result proportions.
        </span>
        <PieChart width={config.width} height={config.height}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={config.outerRadius}
            innerRadius={config.innerRadius}
            strokeWidth={2}
            stroke="var(--background)"
            isAnimationActive
            animationBegin={0}
            animationDuration={200}
            animationEasing="ease-out"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.name === "Fail" ? "var(--chart-fail)" :
                  entry.name === "Warn" ? "var(--chart-warn)" :
                  entry.name === "Pass" ? "var(--chart-pass)" :
                  "var(--chart-missing)"
                }
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {/* Risk level label */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            dy={config.labelY}
            className={cn("text-[11px] font-bold tracking-widest", levelStyle.className)}
          >
            {levelStyle.label}
          </text>
          {/* Total count below risk label */}
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            dy={config.subY}
            className="fill-muted-foreground text-[11px] font-medium tabular-nums"
          >
            {total} checks
          </text>
        </PieChart>
      </div>

      <RiskLevelInfo />
    </div>
  )
}
