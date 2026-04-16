"use client"

import { Cell, Pie, PieChart } from "recharts"
import { cn } from "@/lib/utils"

interface RiskMeterProps {
  readonly value: number
  readonly band: "low" | "medium" | "high"
  readonly size?: "sm" | "md"
}

const BAND_CONFIG = {
  low: { label: "Low Risk", color: "text-emerald-500 dark:text-emerald-400" },
  medium: {
    label: "Medium Risk",
    color: "text-amber-500 dark:text-amber-400",
  },
  high: { label: "High Risk", color: "text-red-500 dark:text-red-400" },
} as const

const TRACK_DATA = [
  { name: "low", value: 30, color: "var(--color-emerald-400)" },
  { name: "medium", value: 30, color: "var(--color-amber-300)" },
  { name: "high", value: 40, color: "var(--color-red-400)" },
]

// 220° sweep: 200° (lower-left) → -20° (lower-right).
// recharts angle convention: 0° = 3 o'clock, increases counter-clockwise.
const START_ANGLE = 200
const END_ANGLE = -20
const NEEDLE_INSET = 4

const SIZE_CONFIG = {
  sm: {
    width: 168,
    height: 122,
    outerRadius: 56,
    innerRadius: 40,
    hubRadius: 3,
    centerY: 58,
    textOffsetX: 4,
    scoreY: 90,
    bandY: 108,
    scoreClassName: "text-base",
    percentClassName: "text-[10px]",
    bandClassName: "text-[11px]",
  },
  md: {
    width: 232,
    height: 166,
    outerRadius: 78,
    innerRadius: 56,
    hubRadius: 4,
    centerY: 80,
    textOffsetX: 5,
    scoreY: 120,
    bandY: 144,
    scoreClassName: "text-2xl",
    percentClassName: "text-xs",
    bandClassName: "text-xs",
  },
} as const

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number
) {
  const radians = (-Math.PI / 180) * angle

  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  }
}

export function RiskMeter({ value, band, size = "md" }: RiskMeterProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const bandInfo = BAND_CONFIG[band]
  const config = SIZE_CONFIG[size]

  // Fixed pixel dimensions. Make SVG generously large so recharts
  // won't shift cx/cy to fit the arc (it does that when the arc
  // is too close to the SVG edge).
  const r = config.outerRadius
  const ir = config.innerRadius
  const hubR = config.hubRadius
  const w = config.width
  const cx = w / 2
  const cy = config.centerY
  const h = config.height
  const textX = cx + config.textOffsetX

  // Needle: interpolate directly across the same sweep the Pie uses.
  // 0% => START_ANGLE (lower-left), 50% => top, 100% => END_ANGLE (lower-right).
  const needleAngleDeg =
    START_ANGLE + (END_ANGLE - START_ANGLE) * (clamped / 100)
  const tip = polarToCartesian(cx, cy, ir - NEEDLE_INSET, needleAngleDeg)

  return (
    <div className="flex justify-center">
      <PieChart width={w} height={h}>
        <Pie
          data={TRACK_DATA}
          dataKey="value"
          nameKey="name"
          cx={cx}
          cy={cy}
          startAngle={START_ANGLE}
          endAngle={END_ANGLE}
          outerRadius={r}
          innerRadius={ir}
          stroke="none"
          isAnimationActive={false}
        >
          {TRACK_DATA.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        {/* Needle — same coordinate space as the Pie */}
        <line
          x1={cx}
          y1={cy}
          x2={tip.x}
          y2={tip.y}
          strokeWidth={2}
          strokeLinecap="round"
          className="stroke-foreground"
        />
        <circle cx={cx} cy={cy} r={hubR} className="fill-foreground" />
        <text
          x={textX}
          y={config.scoreY}
          textAnchor="middle"
          className={cn(
            "fill-foreground font-semibold tabular-nums",
            config.scoreClassName
          )}
        >
          <tspan>{Math.round(clamped)}</tspan>
          <tspan
            dx="1"
            className={cn(
              "fill-muted-foreground font-medium",
              config.percentClassName
            )}
          >
            %
          </tspan>
        </text>
        <text
          x={textX}
          y={config.bandY}
          textAnchor="middle"
          className={cn(
            "fill-current font-medium",
            config.bandClassName,
            bandInfo.color
          )}
        >
          {bandInfo.label}
        </text>
      </PieChart>
    </div>
  )
}
