const configuredApiBase = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/$/, '');

const inferFromWindow = () => {
  if (typeof window === 'undefined') return '';

  const { protocol, hostname, port } = window.location;
  if (port === '5173' || port === '4173') return `${protocol}//${hostname}:8000`;
  if (port === '8000') return `${protocol}//${hostname}:8001`;
  if (port === '8088') return `${protocol}//${hostname}:8001`;

  return `${protocol}//${hostname}:8001`;
};

const normalizeConfiguredBase = (baseUrl: string) => {
  if (!baseUrl || typeof window === 'undefined') return baseUrl;

  try {
    const parsed = new URL(baseUrl);
    const windowHost = window.location.hostname;

    if ((parsed.hostname === 'backend' || parsed.hostname === 'api') && windowHost !== parsed.hostname) {
      parsed.hostname = windowHost;
      return parsed.toString().replace(/\/$/, '');
    }

    return baseUrl;
  } catch {
    return baseUrl;
  }
};

export const inferApiBaseUrl = () => {
  if (configuredApiBase) {
    return normalizeConfiguredBase(configuredApiBase);
  }

  return inferFromWindow();
};

export const resolveApiUrl = (path: string) => {
  const base = inferApiBaseUrl();
  return base ? `${base}${path}` : path;
};
