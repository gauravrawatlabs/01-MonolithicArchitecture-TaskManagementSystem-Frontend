import { type AuthResponse } from '@/types/api';

/**
 * Where the tokens live. Phase 6 keeps BOTH in memory only: enough for the Bearer header and for
 * logout, and a reload simply signs you out.
 *
 * Phase 7 (decision A1, docs/01 §14.3) changes the internals, not this interface: the refresh token
 * moves to localStorage, a cross-tab lock guards refresh, and the startup session check is added.
 * Never log anything stored here.
 */
interface Session {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
}

let session: Session | null = null;

export function setSession(
  auth: Pick<AuthResponse, 'accessToken' | 'accessTokenExpiresAtUtc' | 'refreshToken'>,
): void {
  session = {
    accessToken: auth.accessToken,
    accessTokenExpiresAtUtc: auth.accessTokenExpiresAtUtc,
    refreshToken: auth.refreshToken,
  };
}

export function getAccessToken(): string | null {
  return session?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return session?.refreshToken ?? null;
}

export function clearSession(): void {
  session = null;
}
