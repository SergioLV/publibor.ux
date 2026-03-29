import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface UIState {
  theme: Theme;
  collapsed: boolean;
  mobileOpen: boolean;
  toggleTheme: () => void;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: (localStorage.getItem('raffer-theme') as Theme) || 'light',
  collapsed: false,
  mobileOpen: false,
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('raffer-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },
  setCollapsed: (v) => set({ collapsed: v }),
  setMobileOpen: (v) => set((s) => ({ mobileOpen: typeof v === 'function' ? v(s.mobileOpen) : v })),
}));
