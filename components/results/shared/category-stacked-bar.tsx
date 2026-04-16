interface CategoryStackedBarProps {
  readonly fail: number
  readonly warning: number
  readonly pass: number
  readonly missing: number
  readonly className?: string
}

export function CategoryStackedBar({
  fail,
  warning,
  pass,
  missing,
  className = "w-16",
}: CategoryStackedBarProps) {
  const total = fail + warning + pass + missing
  if (total === 0) return null
  return (
    <div
      className={`flex h-1.5 gap-px overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}
    >
      {fail > 0 && (
        <div
          className="bg-red-400"
          style={{ width: `${(fail / total) * 100}%` }}
        />
      )}
      {warning > 0 && (
        <div
          className="bg-amber-300"
          style={{ width: `${(warning / total) * 100}%` }}
        />
      )}
      {pass > 0 && (
        <div
          className="bg-emerald-400"
          style={{ width: `${(pass / total) * 100}%` }}
        />
      )}
      {missing > 0 && (
        <div
          className="bg-slate-300 dark:bg-slate-600"
          style={{ width: `${(missing / total) * 100}%` }}
        />
      )}
    </div>
  )
}
