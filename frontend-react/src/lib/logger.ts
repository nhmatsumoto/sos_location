type LogContext = Record<string, unknown>;

const formatContext = (context?: LogContext) => (context ? JSON.stringify(context) : '');

const shouldLogDebug = import.meta.env.DEV;

export const frontendLogger = {
  info: (message: string, context?: LogContext) => {
    console.info(`[frontend] ${message}`, formatContext(context));
  },
  warn: (message: string, context?: LogContext) => {
    console.warn(`[frontend] ${message}`, formatContext(context));
  },
  error: (message: string, context?: LogContext) => {
    console.error(`[frontend] ${message}`, formatContext(context));
  },
  debug: (message: string, context?: LogContext) => {
    if (!shouldLogDebug) return;
    console.debug(`[frontend] ${message}`, formatContext(context));
  },
};
