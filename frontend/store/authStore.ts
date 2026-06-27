import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/auth';
import { exchangeGoogleToken, GoogleLoginResult } from '../services/googleAuth';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const result = await authApi.login(email, password);
          set({
            accessToken: result.token,
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          await authApi.register(email, password, name);
          // Auto-login after successful registration
          const result = await authApi.login(email, password);
          set({
            accessToken: result.token,
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      googleLogin: async (idToken: string) => {
        set({ isLoading: true });
        try {
          const result: GoogleLoginResult = await exchangeGoogleToken(idToken);
          set({
            accessToken: result.token,
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Swallow logout errors
        } finally {
          set({
            accessToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      restoreSession: async () => {
        const state = useAuthStore.getState();
        if (!state.accessToken) {
          set({ isHydrated: true });
          return;
        }
        try {
          await authApi.getMe();
          set({ isAuthenticated: true, isHydrated: true, isLoading: false });
        } catch {
          set({
            accessToken: null,
            user: null,
            isAuthenticated: false,
            isHydrated: true,
            isLoading: false,
          });
        }
      },

      setUser: (user: User) => set({ user }),

      setToken: (accessToken: string) => set({ accessToken }),
    }),
    {
      name: 'synapse-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
      skipHydration: true,
    }
  )
);
