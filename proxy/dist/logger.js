function formatMessage(level, context, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta
        ? " | " +
            Object.entries(meta)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
        : "";
    return `[${timestamp}] ${level.padEnd(5)} [${context}] ${message}${metaStr}`;
}
export const logger = {
    info: (context, message, meta) => {
        console.log(formatMessage("INFO", context, message, meta));
    },
    warn: (context, message, meta) => {
        console.warn(formatMessage("WARN", context, message, meta));
    },
    error: (context, message, meta) => {
        console.error(formatMessage("ERROR", context, message, meta));
    },
};
