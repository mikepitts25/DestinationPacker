import { create } from 'zustand';
import type { User } from '@/types';
import { setAuthToken } from '@/services/api';

interface AuthState {
  user: User | null;
  firebaseToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPremium: boolean;
  setUser: (user: User | null) => void;
  setFirebaseToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseToken: null,
  isLoading: true,
  isAuthenticated: false,
  isPremium: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isPremium: user?.subscription === 'premium',
    });
  },

  setFirebaseToken: (token) => {
    setAuthToken(token);
    set({ firebaseToken: token });
  },

  setLoading: (isLoading) => set({ isLoading }),

  signOut: () => {
    setAuthToken(null);
    set({ user: null, firebaseToken: null, isAuthenticated: false, isPremium: false });
  },
}));
