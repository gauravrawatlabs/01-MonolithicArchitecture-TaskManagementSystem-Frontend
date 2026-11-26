import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { clearSession, getRefreshToken, setSession } from '@/services/tokenStorage';
import { type AuthResponse, type UserProfile } from '@/types/api';

import { authApi } from './api/authApi';
import { AuthContext, type AuthContextValue, type EndedSession } from './authContext';
import { PREVIEW_USERS } from './previewUsers';

interface AuthProviderProps {
  children: ReactNode;
  /** Tests start with a signed-in user. Phase 7 replaces this with the real session check. */
  initialUser?: UserProfile | null;
}

/**
 * Owns "who is signed in". Phase 6: real login/logout with tokens held in memory (a reload signs
 * you out). Phase 7 adds persistence, refresh and the startup session check behind the SAME
 * interface, so guards, layout and forms don't change.
 */
export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [endedSession, setEndedSession] = useState<EndedSession | null>(null);

  const completeSignIn = useCallback((auth: AuthResponse) => {
    setSession(auth);
    setEndedSession(null);
    setUser(auth.user);
  }, []);

  const signOut = useCallback(
    (options: EndedSession = {}) => {
      const refreshToken = getRefreshToken();

      // 1. Locally, immediately: the UI must never wait for the network to sign someone out.
      //    RequireAuth sees the new state and navigates to the sign-in page (one navigation source).
      clearSession();
      setEndedSession(options);
      setUser(null);
      queryClient.clear(); // the next person on this browser must not see cached data

      // 2. On the server, best effort: revoke the refresh token. Failure is harmless here
      //    (the token expires anyway, and it's no longer stored in this browser).
      if (refreshToken) {
        void authApi.logout({ refreshToken }).catch(() => undefined);
      }
      return Promise.resolve();
    },
    [queryClient],
  );

  const refreshProfile = useCallback(async () => {
    setUser(await authApi.me());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: user ? 'authenticated' : 'anonymous',
      user,
      endedSession,
      completeSignIn,
      signOut,
      refreshProfile,
      ...(import.meta.env.DEV
        ? {
            previewSignIn: (account) => {
              setEndedSession(null);
              setUser(PREVIEW_USERS[account]);
            },
          }
        : {}),
    }),
    [user, endedSession, completeSignIn, signOut, refreshProfile],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
