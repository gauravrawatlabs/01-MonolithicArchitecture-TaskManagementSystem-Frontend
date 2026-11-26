import { use } from 'react';

import { ThemeContext, type ThemeContextValue } from './themeContext';

/** Current theme and a setter. Must be used inside <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>.');
  }
  return context;
}
