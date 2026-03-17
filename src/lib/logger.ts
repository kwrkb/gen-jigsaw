/**
 * Centralized logger.
 * Error objects output stack trace (or message if unavailable) for debuggability,
 * while preventing raw Error objects from being passed to console methods.
 */

const formatArg = (arg: unknown): unknown => {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }
  return arg;
};

export const logger = {
  info: (...args: unknown[]) => {
    console.info(...args.map(formatArg));
  },
  warn: (...args: unknown[]) => {
    console.warn(...args.map(formatArg));
  },
  error: (...args: unknown[]) => {
    console.error(...args.map(formatArg));
  },
};
