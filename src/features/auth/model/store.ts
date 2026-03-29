import { create } from 'zustand';
import type { AuthUser } from './types';

interface AuthState {
  user: AuthUser | null;
  authed: boolean | null; // null = loading
  setUser: (user: AuthUser) => void;
  setAuthed: (authed: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authed: null,
  setUser: (user) => set({ user, authed: true }),
  setAuthed: (authed) => set({ authed }),
  logout: () => {
    localStorage.removeItem('raffer-token');
    localStorage.removeItem('raffer-token-expires');
    set({ user: null, authed: false });
  },
}));
