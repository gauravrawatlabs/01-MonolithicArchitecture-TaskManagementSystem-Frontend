import { type ReactNode, useEffect, useMemo, useState } from 'react';

import {
  readThemePreference,
  type ThemePreference,
  writeThemePreference,
} from '@/services/preferencesStorage';

import { type ResolvedTheme, ThemeContext, type ThemeContextValue } from './themeContext';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Owns the theme: reads the saved preference, follows the OS when the preference is "system",
 * keeps the .dark class on <html> in sync, and saves changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Follow live OS changes (e.g. automatic dark mode at sunset).
  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  // The ONE place (after the inline script in index.html) that touches the <html> class.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference: (next) => {
        writeThemePreference(next);
        setPreferenceState(next);
      },
    }),
    [preference, resolvedTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
