/**
 * Centralized logger for consistent logging and security compliance.
 * It ensures that raw Error objects are not logged directly, adhering to the
 * security convention of logging only the error message or a generic string.
 */

const formatArg = (arg: unknown): unknown => {
  if (arg instanceof Error) {
    return arg.message;
  }
  return arg;
};

export const logger = {
  info: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.info(...args.map(formatArg));
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(...args.map(formatArg));
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(...args.map(formatArg));
  },
};
