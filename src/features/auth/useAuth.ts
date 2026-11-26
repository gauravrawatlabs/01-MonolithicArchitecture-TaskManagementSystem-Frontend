import { use } from 'react';

import { AuthContext, type AuthContextValue } from './authContext';

/** The signed-in user and session actions. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
