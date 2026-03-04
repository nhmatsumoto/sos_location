import { apiClient } from './apiClient';

export interface AuthzContext {
  roles: string[];
  level: 'viewer' | 'operator' | 'admin';
  isStaff: boolean;
  isSuperuser: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  authz?: AuthzContext;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  async register(payload: { username: string; password: string; email?: string; firstName?: string; lastName?: string }) {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', payload);
    return response.data;
  },
  async login(payload: { username: string; password: string }) {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', payload);
    return response.data;
  },
  async me(token: string) {
    const response = await apiClient.get<{ user: AuthUser }>('/api/auth/me', {
      headers: { Authorization: `Token ${token}` },
    });
    return response.data;
  },
  async logout(token: string) {
    const response = await apiClient.post<{ ok: boolean }>('/api/auth/logout', null, {
      headers: { Authorization: `Token ${token}` },
    });
    return response.data;
  },
  async keycloak(payload: { accessToken: string }) {
    const response = await apiClient.post<AuthResponse>('/api/auth/keycloak', payload);
    return response.data;
  },
};
