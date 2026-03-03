const sanitizeBaseUrl = (baseUrl: string) => {
  const trimmed = (baseUrl || '').trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === '0.0.0.0') {
      parsed.hostname = 'localhost';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/$/, '');
  }
};

const isLoopbackHost = (host: string) => host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

const shouldIgnoreLoopbackBaseUrl = (baseUrl: string) => {
  if (typeof window === 'undefined') return false;

  const allowLoopback = ((import.meta.env.VITE_API_ALLOW_LOOPBACK as string | undefined) ?? '').trim().toLowerCase();
  if (allowLoopback === '1' || allowLoopback === 'true' || allowLoopback === 'yes') {
    return false;
  }

  try {
    const configured = new URL(baseUrl);
    const current = new URL(window.location.origin);

    if (!isLoopbackHost(configured.hostname)) return false;
    return !isLoopbackHost(current.hostname);
  } catch {
    return false;
  }
};

export const inferApiBaseUrl = () => {
  const configuredApiBase = sanitizeBaseUrl((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '');

  if (import.meta.env.DEV) {
    return '';
  }

  if (configuredApiBase) {
    if (shouldIgnoreLoopbackBaseUrl(configuredApiBase)) {
      return '';
    }
    return configuredApiBase;
  }

  return '';
};

export const resolveApiUrl = (path: string) => {
  const base = inferApiBaseUrl();
  return base ? `${base}${path}` : path;
};
