import { createContext } from 'react';

import { type ThemePreference } from '@/services/preferencesStorage';

export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** What the user chose: light, dark, or follow the operating system. */
  preference: ThemePreference;
  /** What is actually shown right now. */
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
