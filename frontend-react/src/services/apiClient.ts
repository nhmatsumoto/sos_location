import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { decode, encode } from '@msgpack/msgpack';
import { inferApiBaseUrl } from '../lib/apiBaseUrl';
import { frontendLogger } from '../lib/logger';
import { getSessionToken } from '../lib/authSession';

let notifyError: ((title: string, message: string) => void) | null = null;
let lastNotification = { key: '', ts: 0 };

const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);
const MAX_NETWORK_RETRIES = 2;
const NOTIFICATION_COOLDOWN_MS = 4000;

type RetryableConfig = InternalAxiosRequestConfig & {
  __retryCount?: number;
  __skipGlobalNotify?: boolean;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkFailure = (error: AxiosError) => {
  if (error.response) return false;
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('network error') || message.includes('failed to fetch') || message.includes('timeout');
};

const isLikelyCorsFailure = (error: AxiosError) => {
  if (!isNetworkFailure(error) || typeof window === 'undefined') return false;

  const baseURL = (error.config?.baseURL || apiClient.defaults.baseURL || '').trim();
  if (!baseURL) return false;

  try {
    const requestOrigin = new URL(baseURL, window.location.origin).origin;
    return requestOrigin !== window.location.origin;
  } catch {
    return false;
  }
};

const shouldRetry = (error: AxiosError) => {
  const config = error.config as RetryableConfig | undefined;
  if (!config) return false;

  const method = (config.method || 'get').toLowerCase();
  if (!RETRYABLE_METHODS.has(method)) return false;
  if (!isNetworkFailure(error)) return false;
  if (isLikelyCorsFailure(error)) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  const currentRetries = config.__retryCount ?? 0;
  return currentRetries < MAX_NETWORK_RETRIES;
};

const normalizeErrorMessage = (error: AxiosError) => {
  if (error.response?.data && typeof error.response.data === 'object') {
    const payload = error.response.data as Record<string, unknown>;
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  }

  if (isNetworkFailure(error)) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'Sem conexão com a internet. Verifique a rede e tente novamente.';
    }
    if (isLikelyCorsFailure(error)) {
      return 'Requisição bloqueada por CORS. Verifique configuração do backend/proxy.';
    }
    const base = inferApiBaseUrl();
    return `Não foi possível conectar ao backend (${base || 'URL não definida'}). Verifique se a API está no ar.`;
  }

  return error.message || 'Erro inesperado na API.';
};

const notifyWithCooldown = (title: string, message: string) => {
  if (!notifyError) return;

  const key = `${title}::${message}`;
  const now = Date.now();
  if (lastNotification.key === key && now - lastNotification.ts < NOTIFICATION_COOLDOWN_MS) return;

  lastNotification = { key, ts: now };
  notifyError(title, message);
};

export const setApiNotifier = (handler: (title: string, message: string) => void) => {
  notifyError = handler;
};

export const apiClient = axios.create({
  baseURL: inferApiBaseUrl(),
  timeout: 10000,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

if (import.meta.env.DEV) {
  frontendLogger.info('API client configured', {
    baseURL: apiClient.defaults.baseURL || '(relative /api via Vite proxy)',
  });
}

export const checkBackendHealth = async () => {
  const response = await apiClient.get('/api/health', { __skipGlobalNotify: true } as any);
  return response.data as { status: string; service: string; timestamp: string };
};

apiClient.interceptors.request.use((config) => {
  frontendLogger.debug('API request started', {
    method: config.method,
    url: `${config.baseURL ?? ''}${config.url ?? ''}`,
  });
  
  const token = getSessionToken();
  if (token) {
    config.headers = config.headers ?? {};
    // Functional views/modules currently expect Bearer
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Support for MessagePack requests
  if (config.headers?.['Content-Type'] === 'application/x-msgpack' && config.data) {
    config.data = encode(config.data);
  }

  // If the client explicitly asks for MessagePack, we must ensure we handle binary response
  const acceptHeader = config.headers?.['Accept'];
  if (typeof acceptHeader === 'string' && acceptHeader.includes('application/x-msgpack')) {
    config.responseType = 'arraybuffer';
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    frontendLogger.debug('API request succeeded', {
      method: response.config.method,
      url: `${response.config.baseURL ?? ''}${response.config.url ?? ''}`,
      status: response.status,
    });

    // Automatic MessagePack decoding
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/x-msgpack') && response.data) {
      try {
        response.data = decode(response.data);
      } catch (err) {
        frontendLogger.error('Failed to decode MessagePack response', { error: err });
      }
    }

    return response;
  },
  async (error: AxiosError) => {
    const config = (error.config || {}) as RetryableConfig;

    if (shouldRetry(error)) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      const backoffMs = config.__retryCount * 400;
      await wait(backoffMs);
      return apiClient(config);
    }

    const message = normalizeErrorMessage(error);
    frontendLogger.error('API request failed', {
      method: config.method,
      url: `${config.baseURL ?? ''}${config.url ?? ''}`,
      status: error.response?.status,
      message,
      code: error.code,
      retries: config.__retryCount ?? 0,
    });

    if (!config.__skipGlobalNotify) {
      notifyWithCooldown('Falha na integração com backend', message);
    }

    return Promise.reject(error);
  },
);
