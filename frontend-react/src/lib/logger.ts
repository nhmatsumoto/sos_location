// removed formatContext
export const frontendLogger = {
  info: (message: string, context?: unknown) => {
    if (import.meta.env.DEV) {
      console.log(`%c[frontend] ${message}`, 'color: #3b82f6; font-weight: bold', context || '');
    }
  },
  warn: (message: string, context?: unknown) => {
    if (import.meta.env.DEV) {
      console.warn(`%c[frontend] ${message}`, 'color: #eab308; font-weight: bold', context || '');
    }
  },
  error: (message: string, context?: unknown) => {
    if (import.meta.env.DEV) {
      console.error(`%c[frontend] ${message}`, 'color: #f43f5e; font-weight: bold', context || '');
    }
  },
  debug: (message: string, context?: unknown) => {
    if (import.meta.env.DEV) {
      console.debug(`%c[frontend] ${message}`, 'color: #94a3b8; font-weight: bold', context || '');
    }
  },
};
