import { createContext } from 'react';

import { type AuthResponse, type UserProfile } from '@/types/api';

import { type PreviewAccount } from './previewUsers';
import { type LoginNotice } from './types';

/**
 * initializing  → checking for an existing session at startup (Phase 7: silent refresh)
 * authenticated → `user` is set
 * anonymous     → nobody is signed in
 */
export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';

/** Why the last session ended, when it was ended ON PURPOSE (set by signOut, cleared by sign-in). */
export interface EndedSession {
  /** Message for the sign-in page, e.g. "Your password was changed…". */
  notice?: LoginNotice;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  /**
   * Set when the user signed out on purpose (menu, password change). RequireAuth then sends them to
   * the sign-in page WITHOUT a returnUrl and with the notice. Callers must not navigate themselves:
   * the guard reacts to the same state change, and two navigations would race.
   */
  endedSession: EndedSession | null;
  /** Stores the tokens and user from a successful login (Phase 7: also refresh). */
  completeSignIn: (auth: AuthResponse) => void;
  /** Ends the session locally at once, then revokes the refresh token on the server (best effort). */
  signOut: (options?: EndedSession) => Promise<void>;
  /** Reloads the user from GET /api/auth/me (e.g. after the email was confirmed). */
  refreshProfile: () => Promise<void>;
  /**
   * TEMPORARY (until Phase 7): signs in as a sample account without calling the API, so the layout,
   * guards and role-based navigation can be explored without a running backend.
   * Defined ONLY in development builds (import.meta.env.DEV).
   */
  previewSignIn?: (account: PreviewAccount) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
