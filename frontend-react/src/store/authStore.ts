import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface User {
  name?: string;
  email?: string;
  preferredUsername?: string;
  xp: number;
  level: number;
  rank: string;
}

interface AuthState {
  user: User | null;
  authenticated: boolean;
  roles: string[];
  token: string | null;
  
  setAuth: (authenticated: boolean, user: Partial<User> | null, roles: string[], token: string | null) => void;
  updateUser: (user: Partial<User>) => void;
  addXp: (amount: number) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      authenticated: false,
      roles: [],
      token: null,

      setAuth: (authenticated, user, roles, token) => {
        if (!user) {
          set({ authenticated, user: null, roles, token });
          return;
        }

        // Default values if not present in user object from OIDC
        const userWithGamification: User = {
          xp: user.xp ?? 0,
          level: user.level ?? 1,
          rank: user.rank ?? 'Recruta',
          name: user.name,
          email: user.email,
          preferredUsername: user.preferredUsername,
        };

        set({ authenticated, user: userWithGamification, roles, token });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : (userData as User),
        })),

      addXp: (amount) =>
        set((state) => {
          if (!state.user) return state;
          const newXp = state.user.xp + amount;
          const newLevel = Math.floor(newXp / 1000) + 1;
          let newRank = state.user.rank;

          if (newLevel >= 50) newRank = 'Sentinel';
          else if (newLevel >= 25) newRank = 'Elite';
          else if (newLevel >= 10) newRank = 'Veterano';
          else newRank = 'Recruta';

          return {
            user: { ...state.user, xp: newXp, level: newLevel, rank: newRank },
          };
        }),

      clearAuth: () => set({ user: null, authenticated: false, roles: [], token: null }),
    }),
    {
      name: 'sos-location-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        authenticated: state.authenticated,
        roles: state.roles,
      }),
    }
  )
);
