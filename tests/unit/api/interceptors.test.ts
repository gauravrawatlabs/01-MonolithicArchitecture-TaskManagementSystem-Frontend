import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/apiError';
import { apiClient } from '@/api/client';
import { getAccessToken, setSession } from '@/services/tokenStorage';

import { apiUrl, problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { buildAuthResponse } from '../../mocks/factories/auth';
import { server } from '../../mocks/server';

const PROTECTED = '/api/protected';

/** A protected endpoint that accepts only the given access token, like the real API. */
function protectedEndpoint(validToken: string) {
  const seen: (string | null)[] = [];
  server.use(
    http.get(apiUrl(PROTECTED), ({ request }) => {
      const authorization = request.headers.get('Authorization');
      seen.push(authorization);
      return authorization === `Bearer ${validToken}`
        ? HttpResponse.json({ ok: true })
        : problem(401);
    }),
  );
  return seen;
}

function signIn() {
  setSession(buildAuthResponse(undefined, { accessToken: 'EXPIRED', refreshToken: 'R1' }));
}

describe('auth interceptor', () => {
  it('on 401: refreshes, then retries the request once with the NEW access token', async () => {
    signIn();
    const seen = protectedEndpoint('FRESH');
    captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(undefined, { accessToken: 'FRESH', refreshToken: 'R2' })),
    );

    const response = await apiClient.get(PROTECTED);

    expect(response.data).toEqual({ ok: true });
    expect(seen).toEqual(['Bearer EXPIRED', 'Bearer FRESH']);
    expect(getAccessToken()).toBe('FRESH');
  });

  it('shares ONE refresh between many requests that fail at the same time', async () => {
    signIn();
    protectedEndpoint('FRESH');
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(undefined, { accessToken: 'FRESH' })),
    );

    const results = await Promise.all(Array.from({ length: 5 }, () => apiClient.get(PROTECTED)));

    expect(refreshCalls).toHaveLength(1);
    expect(results.every((result) => (result.data as { ok: boolean }).ok)).toBe(true);
  });

  it('a late 401 (its request left BEFORE another refresh finished) retries with the new token, no 2nd refresh', async () => {
    signIn();
    let calls = 0;
    const seen: (string | null)[] = [];
    server.use(
      http.get(apiUrl(PROTECTED), async ({ request }) => {
        const authorization = request.headers.get('Authorization');
        seen.push(authorization);
        calls += 1;
        if (authorization === 'Bearer FRESH') return HttpResponse.json({ ok: true });
        // The second request was sent with the old token, but its 401 only comes back AFTER the first
        // request's refresh has already completed (a slow response in the same batch).
        if (calls === 2) {
          while (getAccessToken() !== 'FRESH') await delay(5);
        }
        return problem(401);
      }),
    );
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(undefined, { accessToken: 'FRESH', refreshToken: 'R2' })),
    );

    const results = await Promise.all([apiClient.get(PROTECTED), apiClient.get(PROTECTED)]);

    expect(results.map((r) => (r.data as { ok: boolean }).ok)).toEqual([true, true]);
    expect(refreshCalls).toHaveLength(1); // the late 401 must NOT start a second refresh (token rotation)
    expect(seen.filter((a) => a === 'Bearer FRESH')).toHaveLength(2);
  });

  it('gives up with the original 401 when the refresh is rejected', async () => {
    signIn();
    protectedEndpoint('NEVER');
    server.use(http.post(apiUrl('/api/auth/refresh'), () => problem(401)));

    await expect(apiClient.get(PROTECTED)).rejects.toMatchObject({
      kind: 'unauthorized',
      status: 401,
    });
    expect(getAccessToken()).toBeNull();
  });

  it('retries at most once (no endless refresh loop if the new token is rejected too)', async () => {
    signIn();
    const seen = protectedEndpoint('NEVER');
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(undefined, { accessToken: 'ALSO-REJECTED' })),
    );

    await expect(apiClient.get(PROTECTED)).rejects.toBeInstanceOf(ApiError);
    expect(seen).toHaveLength(2);
    expect(refreshCalls).toHaveLength(1);
  });

  it('never refreshes for requests marked skipAuthRefresh (e.g. login with a wrong password)', async () => {
    signIn();
    server.use(
      http.post(apiUrl('/api/auth/login'), () =>
        problem(401, { detail: 'Invalid email or password.' }),
      ),
    );
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse()),
    );

    await expect(
      apiClient.post('/api/auth/login', {}, { skipAuthRefresh: true }),
    ).rejects.toMatchObject({
      detail: 'Invalid email or password.',
    });
    expect(refreshCalls).toHaveLength(0);
  });

  it('does not try to refresh when there is no session at all', async () => {
    protectedEndpoint('ANY');
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse()),
    );

    await expect(apiClient.get(PROTECTED)).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(refreshCalls).toHaveLength(0);
  });

  it('passes other errors straight through as ApiError (no refresh for 403)', async () => {
    signIn();
    server.use(http.get(apiUrl(PROTECTED), () => problem(403, { detail: 'Email not verified.' })));
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse()),
    );

    await expect(apiClient.get(PROTECTED)).rejects.toMatchObject({ kind: 'forbidden' });
    expect(refreshCalls).toHaveLength(0);
  });
});
