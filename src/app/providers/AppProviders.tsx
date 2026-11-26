import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { ThemeProvider } from '@/contexts/theme';
import { ToastProvider } from '@/contexts/toast';
import { AuthProvider } from '@/features/auth';
import { type UserProfile } from '@/types/api';

import { createQueryClient } from './queryClient';

interface AppProvidersProps {
  children: ReactNode;
  /** Test seam: start signed in. Not used by the running app. */
  initialUser?: UserProfile | null;
}

/**
 * All app-wide providers in one place, in dependency order (outermost first).
 * QueryClientProvider is outside AuthProvider because signing out clears the query cache.
 */
export function AppProviders({ children, initialUser }: AppProvidersProps) {
  // useState, not a module constant: every mounted app (and every test) gets its own cache.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
