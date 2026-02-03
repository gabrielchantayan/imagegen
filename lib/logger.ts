import { AsyncLocalStorage } from "async_hooks";

// Log levels with corresponding numeric values for filtering
export const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

type LogContext = {
  correlation_id?: string;
  generation_id?: string;
  queue_item_id?: string;
  [key: string]: unknown;
};

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
  };
};

// AsyncLocalStorage for request-scoped correlation IDs
const correlation_storage = new AsyncLocalStorage<string>();

// Current log level (can be set via environment variable)
const get_current_level = (): LogLevel => {
  const env_level = process.env.LOG_LEVEL?.toLowerCase();
  if (env_level && env_level in LOG_LEVELS) {
    return env_level as LogLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
};

// Generate a correlation ID
export const generate_correlation_id = (): string => {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

// Run a function with a correlation ID in context
export const with_correlation_id = <T>(correlation_id: string, fn: () => T): T => {
  return correlation_storage.run(correlation_id, fn);
};

// Get current correlation ID from context
export const get_correlation_id = (): string | undefined => {
  return correlation_storage.getStore();
};

// Format log entry for console output
const format_log = (entry: LogEntry): string => {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
  ];

  if (entry.context?.correlation_id) {
    parts.push(`[${entry.context.correlation_id}]`);
  }

  parts.push(entry.message);

  // Add context fields (excluding correlation_id which is already shown)
  const context_without_correlation = entry.context
    ? Object.fromEntries(
        Object.entries(entry.context).filter(([k]) => k !== "correlation_id")
      )
    : undefined;

  if (context_without_correlation && Object.keys(context_without_correlation).length > 0) {
    parts.push(JSON.stringify(context_without_correlation));
  }

  if (entry.error) {
    parts.push(`Error: ${entry.error.message}`);
    if (entry.error.stack && get_current_level() === "debug") {
      parts.push(`\n${entry.error.stack}`);
    }
  }

  return parts.join(" ");
};

// Core logging function
const log = (level: LogLevel, message: string, context?: LogContext, error?: Error): void => {
  const current_level = get_current_level();
  if (LOG_LEVELS[level] < LOG_LEVELS[current_level]) {
    return;
  }

  const correlation_id = context?.correlation_id || get_correlation_id();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: correlation_id ? { ...context, correlation_id } : context,
  };

  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
    };
  }

  const formatted = format_log(entry);

  switch (level) {
    case "debug":
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
};

// Logger object with convenience methods
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext, error?: Error) => log("warn", message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => log("error", message, context, error),

  // Create a child logger with preset context
  child: (preset_context: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log("debug", message, { ...preset_context, ...context }),
    info: (message: string, context?: LogContext) =>
      log("info", message, { ...preset_context, ...context }),
    warn: (message: string, context?: LogContext, error?: Error) =>
      log("warn", message, { ...preset_context, ...context }, error),
    error: (message: string, context?: LogContext, error?: Error) =>
      log("error", message, { ...preset_context, ...context }, error),
  }),
};

// Specialized loggers for common use cases
export const create_queue_logger = (queue_item_id: string, generation_id?: string) => {
  return logger.child({ queue_item_id, generation_id });
};

export const create_api_logger = (correlation_id: string) => {
  return logger.child({ correlation_id });
};
