import { createContext } from 'react';

import { type UserProfile } from '@/types/api';

import { type PreviewAccount } from './previewUsers';

/**
 * initializing  → checking for an existing session at startup (Phase 7: silent refresh)
 * authenticated → `user` is set
 * anonymous     → nobody is signed in
 */
export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  signOut: () => Promise<void>;
  /**
   * TEMPORARY (Phase 5 only): signs in as a sample account without calling the API, so the layout,
   * guards and role-based navigation can be explored before real login exists.
   * Defined ONLY in development builds (import.meta.env.DEV); removed when Phase 7 adds real login.
   */
  previewSignIn?: (account: PreviewAccount) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
