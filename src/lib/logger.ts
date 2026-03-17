/**
 * Centralized logger for consistent logging and security compliance.
 *
 * It provides:
 * 1. Consistent formatting with log levels.
 * 2. Proper handling of Error objects (extracting message and stack).
 * 3. A centralized point for future logging enhancements (e.g. external services).
 */

const formatArg = (arg: unknown): unknown => {
  if (arg instanceof Error) {
    // Combine message and stack for better debugging, if stack is available
    return arg.stack || arg.message;
  }
  return arg;
};

export const logger = {
  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.info("[INFO]", ...args.map(formatArg));
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn("[WARN]", ...args.map(formatArg));
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error("[ERROR]", ...args.map(formatArg));
  },
};
