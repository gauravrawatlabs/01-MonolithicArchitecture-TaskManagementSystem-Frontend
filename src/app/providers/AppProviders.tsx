import { type ReactNode } from 'react';

import { ThemeProvider } from '@/contexts/theme';
import { ToastProvider } from '@/contexts/toast';

/**
 * All app-wide providers in one place, in dependency order (outermost first).
 * Phase 7 adds QueryClientProvider and AuthProvider here.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
