import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { type UserProfile } from '@/types/api';

import { AuthContext, type AuthContextValue } from './authContext';
import { PREVIEW_USERS } from './previewUsers';

interface AuthProviderProps {
  children: ReactNode;
  /** Tests start with a signed-in user. Phase 7 replaces this with the real session check. */
  initialUser?: UserProfile | null;
}

/**
 * Owns "who is signed in". Phase 5 keeps the user in memory only (a reload signs you out);
 * Phase 7 adds login, token storage, refresh and the startup session check behind the SAME
 * interface (status, user, signOut), so guards and layout don't change.
 */
export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(initialUser);

  const signOut = useCallback(() => {
    setUser(null);
    return Promise.resolve();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: user ? 'authenticated' : 'anonymous',
      user,
      signOut,
      ...(import.meta.env.DEV
        ? {
            previewSignIn: (account) => {
              setUser(PREVIEW_USERS[account]);
            },
          }
        : {}),
    }),
    [user, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
