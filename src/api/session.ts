import axios from 'axios';

import { env } from '@/constants/env';
import { withRefreshLock } from '@/services/sessionSync';
import { clearSession, getRefreshToken, setSession } from '@/services/tokenStorage';
import { type AuthResponse } from '@/types/api';

import { ApiError, toApiError } from './apiError';

/**
 * A minimal client JUST for POST /api/auth/refresh: no interceptors, so a failing refresh can
 * never trigger another refresh (no loops), and no import cycle with apiClient.
 */
const refreshClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  adapter: 'fetch',
  headers: { Accept: 'application/json' },
});

const refreshedListeners = new Set<(auth: AuthResponse) => void>();
const expiredListeners = new Set<() => void>();

/** Called after every successful refresh (interceptor, timer, startup) with the new user/tokens. */
export function onSessionRefreshed(listener: (auth: AuthResponse) => void): () => void {
  refreshedListeners.add(listener);
  return () => refreshedListeners.delete(listener);
}

/** Called when the server rejects the refresh token (expired, revoked, reused): the session is over. */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

let inFlight: Promise<AuthResponse> | null = null;

/**
 * Gets a new token pair. Safe to call from anywhere, any number of times:
 *   • in this tab: concurrent callers share ONE request (single-flight promise)
 *   • across tabs: one refresh at a time (Web Lock), and the refresh token is read AFTER the lock is
 *     acquired, so a tab that waited uses the token the previous tab just received. Using a rotated
 *     token again would make the backend revoke every session (reuse detection).
 * Only a 401 from the server ends the session; a network failure keeps the tokens for a later retry.
 */
export function refreshSession(): Promise<AuthResponse> {
  inFlight ??= withRefreshLock(performRefresh).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function performRefresh(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken(); // newest value, read inside the lock
  if (!refreshToken) {
    expire();
    throw new ApiError({
      kind: 'unauthorized',
      status: 401,
      detail: 'There is no session to refresh.',
    });
  }

  try {
    const { data } = await refreshClient.post<AuthResponse>(
      '/api/auth/refresh',
      { refreshToken },
      { skipAuthRefresh: true },
    );
    setSession(data);
    refreshedListeners.forEach((listener) => {
      listener(data);
    });
    return data;
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.kind === 'unauthorized') {
      expire();
    }
    throw apiError;
  }
}

function expire(): void {
  clearSession();
  expiredListeners.forEach((listener) => {
    listener();
  });
}

/** Refresh this long before the access token expires, so requests rarely meet a 401 at all. */
export const PROACTIVE_REFRESH_LEAD_MS = 60_000;

/**
 * The longest delay setTimeout supports (2^31 − 1 ms ≈ 24.8 days). A LARGER value overflows and the
 * timer fires IMMEDIATELY, so a long-lived token would trigger a refresh right after every sign-in.
 */
export const MAX_TIMER_DELAY_MS = 2_147_483_647;

/** Milliseconds until the proactive refresh (0 = now), or null if the expiry is unknown/invalid. */
export function computeRefreshDelay(
  accessTokenExpiresAtUtc: string | null,
  now: number = Date.now(),
): number | null {
  if (!accessTokenExpiresAtUtc) return null;
  const expiresAt = Date.parse(accessTokenExpiresAtUtc);
  if (Number.isNaN(expiresAt)) return null;
  return Math.min(MAX_TIMER_DELAY_MS, Math.max(0, expiresAt - now - PROACTIVE_REFRESH_LEAD_MS));
}
