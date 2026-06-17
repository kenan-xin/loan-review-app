type LogLevel = "INFO" | "WARN" | "ERROR"

function formatMessage(
  level: LogLevel,
  context: string,
  message: string,
  meta?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString()
  const metaStr = meta
    ? " | " +
      Object.entries(meta)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : ""
  return `[${timestamp}] ${level.padEnd(5)} [${context}] ${message}${metaStr}`
}

export const logger = {
  info: (context: string, message: string, meta?: Record<string, unknown>) => {
    console.log(formatMessage("INFO", context, message, meta))
  },
  warn: (context: string, message: string, meta?: Record<string, unknown>) => {
    console.warn(formatMessage("WARN", context, message, meta))
  },
  error: (context: string, message: string, meta?: Record<string, unknown>) => {
    console.error(formatMessage("ERROR", context, message, meta))
  },
}
