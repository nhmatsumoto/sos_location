import { create } from 'zustand';

interface User {
  name?: string;
  email?: string;
  preferredUsername?: string;
}

interface AuthState {
  user: User | null;
  authenticated: boolean;
  roles: string[];
  token: string | null;
  
  setAuth: (authenticated: boolean, user: User | null, roles: string[], token: string | null) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authenticated: false,
  roles: [],
  token: null,

  setAuth: (authenticated, user, roles, token) => set({ authenticated, user, roles, token }),
  
  updateUser: (userData) => set((state) => ({
    user: state.user ? { ...state.user, ...userData } : (userData as User)
  })),

  clearAuth: () => set({ user: null, authenticated: false, roles: [], token: null }),
}));
