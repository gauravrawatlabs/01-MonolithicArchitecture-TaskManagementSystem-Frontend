import { type ReactNode } from 'react';

import { ThemeProvider } from '@/contexts/theme';
import { ToastProvider } from '@/contexts/toast';
import { AuthProvider } from '@/features/auth';
import { type UserProfile } from '@/types/api';

interface AppProvidersProps {
  children: ReactNode;
  /** Test seam: start signed in. Not used by the running app. */
  initialUser?: UserProfile | null;
}

/**
 * All app-wide providers in one place, in dependency order (outermost first).
 * Phase 7 adds QueryClientProvider here, and AuthProvider gains the real session logic.
 */
export function AppProviders({ children, initialUser }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
