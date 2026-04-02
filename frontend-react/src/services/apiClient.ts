import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { decode, encode } from '@msgpack/msgpack';
import { inferApiBaseUrl } from '../lib/apiBaseUrl';
import { frontendLogger } from '../lib/logger';
import { clearSessionToken } from '../lib/authSession';
import { keycloak, refreshSessionToken } from '../lib/keycloak';
import { useAuthStore } from '../store/authStore';

declare module 'axios' {
  interface AxiosRequestConfig {
    __retryCount?: number;
    __skipGlobalNotify?: boolean;
    __authRetryAttempted?: boolean;
  }

  interface InternalAxiosRequestConfig {
    __retryCount?: number;
    __skipGlobalNotify?: boolean;
    __authRetryAttempted?: boolean;
  }
}

// Type definitions
type RetryableConfig = InternalAxiosRequestConfig;

// State for notifications
let notifyError: ((title: string, message: string) => void) | null = null;
let lastNotification = { key: '', ts: 0 };
const NOTIFICATION_COOLDOWN_MS = 4000;
const MAX_NETWORK_RETRIES = 2;
const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);

// Helpers
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkFailure = (error: AxiosError) => {
  if (error.response) return false;
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('network error') || message.includes('failed to fetch') || message.includes('timeout');
};

const isLikelyCorsFailure = (error: AxiosError) => {
  if (!isNetworkFailure(error) || typeof window === 'undefined') return false;
  const baseURL = (error.config?.baseURL || '').trim();
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
  return (config.__retryCount ?? 0) < MAX_NETWORK_RETRIES;
};

const notifyWithCooldown = (title: string, message: string) => {
  if (!notifyError) return;
  const key = `${title}::${message}`;
  const now = Date.now();
  if (lastNotification.key === key && now - lastNotification.ts < NOTIFICATION_COOLDOWN_MS) return;
  lastNotification = { key, ts: now };
  notifyError(title, message);
};

const normalizeErrorMessage = (error: AxiosError) => {
  if (error.response?.data && typeof error.response.data === 'object') {
    const payload = error.response.data as Record<string, unknown>;
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  }
  if (isNetworkFailure(error)) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'Sem conexão com a internet.';
    }
    const base = inferApiBaseUrl();
    return `Erro de conexão (${base}).`;
  }
  return error.message || 'Erro inesperado na API.';
};

// API Client Creation
export const apiClient = axios.create({
  baseURL: inferApiBaseUrl() || '/api',
  timeout: 120000,
  withCredentials: true,
});

export const setApiNotifier = (handler: (title: string, message: string) => void) => {
  notifyError = handler;
};

export const silentRequestConfig: AxiosRequestConfig = {
  __skipGlobalNotify: true,
};

// Request Interceptor
apiClient.interceptors.request.use(async (config) => {
  const baseURL = config.baseURL || '';
  let url = config.url || '';

  // BULLETPROOF: Prevent double /api prefix
  if (baseURL.endsWith('/api') || baseURL.endsWith('/api/')) {
    if (url.startsWith('/api/')) {
      url = url.substring(4);
    } else if (url.startsWith('api/')) {
      url = url.substring(3);
    } else if (url === '/api' || url === 'api') {
      url = '/';
    }
    // Ensure leading slash
    if (url && !url.startsWith('/') && !url.startsWith('http')) {
      url = '/' + url;
    }
    config.url = url;
  }

  const existingAuthHeader =
    (typeof config.headers?.Authorization === 'string' && config.headers.Authorization) ||
    (typeof config.headers?.authorization === 'string' && config.headers.authorization) ||
    null;

  if (!existingAuthHeader && keycloak.authenticated) {
    await refreshSessionToken(60);
  }

  const token = existingAuthHeader || keycloak.token;
  if (token && !existingAuthHeader) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Support for MessagePack
  if (config.headers?.['Content-Type'] === 'application/x-msgpack' && config.data) {
    config.data = encode(config.data);
  }
  if (config.headers?.['Accept'] && 
      typeof config.headers['Accept'] === 'string' && 
      config.headers['Accept'].includes('application/x-msgpack')) {
    config.responseType = 'arraybuffer';
  }

  return config;
});

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // User Metadata from Header
    const userInfoHeader = response.headers['x-user-metadata'];
    if (userInfoHeader) {
      try {
        const metadata = JSON.parse(atob(userInfoHeader));
        useAuthStore.getState().updateUser(metadata);
      } catch (e) {
        frontendLogger.error('Failed to parse user metadata header', { error: e });
      }
    }

    // MessagePack Decoding
    const contentType = response.headers['content-type'];
    if (contentType?.includes('application/x-msgpack') && response.data) {
      try {
        response.data = decode(response.data);
      } catch (err) {
        frontendLogger.error('Failed to decode MessagePack', { error: err });
      }
    }

    // Unwrap Envelope
    const data = response.data;
    if (data && typeof data === 'object') {
      const isSuccess = data.isSuccess ?? data.IsSuccess;
      if (isSuccess !== undefined) {
        if (isSuccess) {
          response.data = data.data ?? data.Data;
        } else {
          return Promise.reject(new Error(data.error ?? data.Error ?? 'Server error result'));
        }
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = (error.config || {}) as RetryableConfig;

    if (error.response?.status === 401) {
      if (!config.__authRetryAttempted) {
        config.__authRetryAttempted = true;
        await refreshSessionToken(30);

        if (keycloak.token) {
          return apiClient(config);
        }
      }

      notifyWithCooldown('Sessão Expirada', 'Faça login novamente.');
      useAuthStore.getState().clearAuth();
      clearSessionToken();
      return Promise.reject(error);
    }

    if (shouldRetry(error)) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      await wait(config.__retryCount * 500);
      return apiClient(config);
    }

    const message = normalizeErrorMessage(error);
    if (!config.__skipGlobalNotify) {
      notifyWithCooldown('Erro na API', message);
    }
    return Promise.reject(error);
  }
);

export const checkBackendHealth = async () => {
  const response = await apiClient.get('/health', silentRequestConfig);
  return response.data;
};
