import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'support';
  status: 'active' | 'suspended' | 'pending_verification';
  emailVerifiedAt: string | null;
  preferences: {
    language: string;
    timezone: string;
    theme: string;
  };
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserProfile, tokens: AuthTokens) => void;
  setTokens: (tokens: AuthTokens) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user: UserProfile, tokens: AuthTokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),
      setTokens: (tokens: AuthTokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),
      updateUser: (partialUser: Partial<UserProfile>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        })),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'videoforge-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
