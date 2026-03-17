/**
 * Centralized logger for consistent logging and security compliance.
 *
 * It provides:
 * 1. Consistent formatting with timestamps and log levels.
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

const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.info(`[${getTimestamp()}] [INFO]`, ...args.map(formatArg));
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(`[${getTimestamp()}] [WARN]`, ...args.map(formatArg));
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(`[${getTimestamp()}] [ERROR]`, ...args.map(formatArg));
  },
};
