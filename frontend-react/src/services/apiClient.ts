import axios from 'axios';
import { inferApiBaseUrl } from '../lib/apiBaseUrl';
import { frontendLogger } from '../lib/logger';

export const apiClient = axios.create({
  baseURL: inferApiBaseUrl(),
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  frontendLogger.debug('API request started', {
    method: config.method,
    url: `${config.baseURL ?? ''}${config.url ?? ''}`,
  });

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    frontendLogger.debug('API request succeeded', {
      method: response.config.method,
      url: `${response.config.baseURL ?? ''}${response.config.url ?? ''}`,
      status: response.status,
    });

    return response;
  },
  (error) => {
    frontendLogger.error('API request failed', {
      method: error.config?.method,
      url: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
      status: error.response?.status,
      message: error.message,
    });

    return Promise.reject(error);
  },
);
