import { type AuthResponse } from '@/types/api';

/**
 * Where the tokens live (decision A1, docs/01 §14.3):
 *
 *   access token  → this tab's MEMORY only. Short-lived (15 min); never written to storage,
 *                   so a stolen localStorage dump can't call the API directly.
 *   refresh token → localStorage, so a reload or a new tab can restore the session silently.
 *                   It is opaque, rotated on every use, and reuse revokes all sessions (backend).
 *
 * The refresh token is READ FROM STORAGE EVERY TIME (not cached): another tab may have rotated it
 * a moment ago, and sending an old one would trigger the backend's reuse detection.
 * Never log anything stored here.
 */
export const REFRESH_TOKEN_STORAGE_KEY = 'tms.refreshToken';

interface StoredRefreshToken {
  token: string;
  expiresAtUtc: string;
}

let accessToken: string | null = null;
let accessTokenExpiresAtUtc: string | null = null;

export function setSession(
  auth: Pick<
    AuthResponse,
    'accessToken' | 'accessTokenExpiresAtUtc' | 'refreshToken' | 'refreshTokenExpiresAtUtc'
  >,
): void {
  accessToken = auth.accessToken;
  accessTokenExpiresAtUtc = auth.accessTokenExpiresAtUtc;
  const stored: StoredRefreshToken = {
    token: auth.refreshToken,
    expiresAtUtc: auth.refreshTokenExpiresAtUtc,
  };
  try {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked (privacy mode): the session still works in this tab until it is closed.
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAccessTokenExpiresAtUtc(): string | null {
  return accessTokenExpiresAtUtc;
}

function isStoredRefreshToken(value: unknown): value is StoredRefreshToken {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.token === 'string' &&
    candidate.token !== '' &&
    typeof candidate.expiresAtUtc === 'string'
  );
}

/** The current refresh token, or null if there is none, it's unreadable, or it has expired. */
export function getRefreshToken(now: number = Date.now()): string | null {
  try {
    const raw = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredRefreshToken(parsed)) return null;
    // Expired → don't bother the server; it would answer 401 anyway.
    return Date.parse(parsed.expiresAtUtc) > now ? parsed.token : null;
  } catch {
    return null;
  }
}

/** Forgets the access token in this tab only (e.g. another tab signed out; storage is already clear). */
export function clearAccessToken(): void {
  accessToken = null;
  accessTokenExpiresAtUtc = null;
}

/** Ends the session in this browser: memory and storage. Other tabs notice via the storage event. */
export function clearSession(): void {
  clearAccessToken();
  try {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
