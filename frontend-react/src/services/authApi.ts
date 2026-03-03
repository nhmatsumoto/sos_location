import { apiClient } from './apiClient';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
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
};
