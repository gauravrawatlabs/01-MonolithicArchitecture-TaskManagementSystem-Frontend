import { createContext } from 'react';

import { type AuthResponse, type UserProfile } from '@/types/api';

import { type LoginNotice } from './types';

/**
 * initializing  → restoring a stored session at startup (silent refresh)
 * authenticated → `user` is set
 * anonymous     → nobody is signed in
 */
export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';

/** Why the last session ended, when the app ended it (set on sign-out/expiry, cleared on sign-in). */
export interface EndedSession {
  /** Message for the sign-in page. */
  notice?: LoginNotice;
  /** Come back to the current page after signing in (session expiry), instead of the dashboard. */
  keepReturnUrl?: boolean;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  /**
   * Set when the session ended (sign-out, password change, expiry, another tab). RequireAuth then
   * sends the user to the sign-in page with the notice. Callers never navigate themselves: the
   * guard reacts to the same state change, and two navigations would race.
   */
  endedSession: EndedSession | null;
  /** The startup session check couldn't reach the server (offline): the session is kept. */
  sessionCheckFailed: boolean;
  /** Tries the startup session check again. */
  retrySessionCheck: () => void;
  /** Stores the tokens and user from a successful login. */
  completeSignIn: (auth: AuthResponse) => void;
  /** Ends the session locally at once, then revokes the refresh token on the server (best effort). */
  signOut: (options?: EndedSession) => Promise<void>;
  /** Reloads the user from GET /api/auth/me (e.g. after a profile change). */
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
