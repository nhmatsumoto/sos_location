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

export const inferApiBaseUrl = () => {
  const configuredApiBase = sanitizeBaseUrl((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '');

  if (configuredApiBase) {
    return configuredApiBase;
  }

  if (import.meta.env.DEV) {
    return '';
  }

  return '';
};

export const resolveApiUrl = (path: string) => {
  const base = inferApiBaseUrl();
  return base ? `${base}${path}` : path;
};
