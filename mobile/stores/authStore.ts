import { create } from 'zustand';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPremium: boolean;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sessionToken: null,
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

  setSessionToken: (token) => set({ sessionToken: token }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, sessionToken: null, isAuthenticated: false, isPremium: false });
  },
}));
