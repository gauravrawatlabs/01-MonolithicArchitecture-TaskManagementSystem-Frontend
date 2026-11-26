import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/apiError';
import {
  computeRefreshDelay,
  MAX_TIMER_DELAY_MS,
  onSessionExpired,
  onSessionRefreshed,
  refreshSession,
} from '@/api/session';
import { withRefreshLock } from '@/services/sessionSync';
import {
  getAccessToken,
  getRefreshToken,
  REFRESH_TOKEN_STORAGE_KEY,
  setSession,
} from '@/services/tokenStorage';

import { apiUrl, problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { buildAuthResponse } from '../../mocks/factories/auth';
import { server } from '../../mocks/server';

const unsubscribers: (() => void)[] = [];
afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => {
    unsubscribe();
  });
});

function storeRefreshToken(token: string) {
  setSession(buildAuthResponse(undefined, { accessToken: 'old-access', refreshToken: token }));
}

describe('refreshSession', () => {
  it('rotates the tokens: sends the stored refresh token, stores the new pair, notifies listeners', async () => {
    storeRefreshToken('R1');
    const calls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(undefined, { accessToken: 'A2', refreshToken: 'R2' })),
    );
    const refreshed = vi.fn();
    unsubscribers.push(onSessionRefreshed(refreshed));

    const auth = await refreshSession();

    expect(calls[0]?.body).toEqual({ refreshToken: 'R1' });
    expect(auth.accessToken).toBe('A2');
    expect(getAccessToken()).toBe('A2');
    expect(getRefreshToken()).toBe('R2');
    expect(refreshed).toHaveBeenCalledWith(auth);
  });

  it('sends ONE request for many concurrent callers in this tab (single-flight)', async () => {
    storeRefreshToken('R1');
    const calls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse()),
    );

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(calls).toHaveLength(1);
    expect(new Set(results).size).toBe(1);
  });

  it('reads the refresh token AFTER getting the lock (another tab may have rotated it meanwhile)', async () => {
    storeRefreshToken('R1');
    const calls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse()),
    );
    let releaseOtherTab: () => void = () => undefined;

    // "Another tab" holds the lock and rotates R1 → R2 while we wait.
    const otherTab = withRefreshLock(
      () =>
        new Promise<void>((resolve) => {
          releaseOtherTab = () => {
            window.localStorage.setItem(
              REFRESH_TOKEN_STORAGE_KEY,
              JSON.stringify({ token: 'R2', expiresAtUtc: '2099-01-01T00:00:00Z' }),
            );
            resolve();
          };
        }),
    );
    const ours = refreshSession();
    await Promise.resolve();
    releaseOtherTab();
    await Promise.all([otherTab, ours]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual({ refreshToken: 'R2' }); // never the already-used R1
  });

  it('ends the session when the server rejects the token (401)', async () => {
    storeRefreshToken('REVOKED');
    server.use(
      http.post(apiUrl('/api/auth/refresh'), () =>
        problem(401, { detail: 'The refresh token is invalid…' }),
      ),
    );
    const expired = vi.fn();
    unsubscribers.push(onSessionExpired(expired));

    await expect(refreshSession()).rejects.toMatchObject({ kind: 'unauthorized' });

    expect(expired).toHaveBeenCalledOnce();
    expect(getRefreshToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('KEEPS the session when the server is unreachable (a Wi-Fi blip must not sign anyone out)', async () => {
    storeRefreshToken('R1');
    server.use(http.post(apiUrl('/api/auth/refresh'), () => HttpResponse.error()));
    const expired = vi.fn();
    unsubscribers.push(onSessionExpired(expired));

    await expect(refreshSession()).rejects.toMatchObject({ kind: 'network' });

    expect(expired).not.toHaveBeenCalled();
    expect(getRefreshToken()).toBe('R1');
  });

  it('reports "unauthorized" without a request when there is no stored session', async () => {
    const calls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse()),
    );

    await expect(refreshSession()).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(0);
  });
});

describe('computeRefreshDelay', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');

  it('schedules the refresh 60 s before expiry', () => {
    expect(computeRefreshDelay('2026-11-26T12:15:00Z', now)).toBe(14 * 60_000);
  });

  it('refreshes immediately when the token is (nearly) expired', () => {
    expect(computeRefreshDelay('2026-11-26T12:00:30Z', now)).toBe(0);
    expect(computeRefreshDelay('2026-11-26T11:00:00Z', now)).toBe(0);
  });

  it('caps very long delays at the setTimeout maximum (larger values would fire immediately)', () => {
    expect(computeRefreshDelay('2099-01-01T00:00:00Z', now)).toBe(MAX_TIMER_DELAY_MS);
  });

  it('returns null for a missing or invalid expiry', () => {
    expect(computeRefreshDelay(null, now)).toBeNull();
    expect(computeRefreshDelay('not a date', now)).toBeNull();
  });
});
