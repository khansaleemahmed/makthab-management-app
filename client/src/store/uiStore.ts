import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'ar';

interface UiState {
  sidebarOpen: boolean;
  locale: Locale;
  /** Selected academic year id used to scope list queries across the app. */
  academicYearId: number | null;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  setLocale: (locale: Locale) => void;
  setAcademicYearId: (id: number | null) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      locale: 'en',
      academicYearId: null,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (open) => set({ sidebarOpen: open }),
      setLocale: (locale) => set({ locale }),
      setAcademicYearId: (academicYearId) => set({ academicYearId }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'marthab-ui' },
  ),
);
