import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAccessToken,
  getRefreshToken,
  REFRESH_TOKEN_STORAGE_KEY,
  setSession,
} from '@/services/tokenStorage';

import { apiUrl, problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { buildAuthResponse } from '../../mocks/factories/auth';
import { buildUser } from '../../mocks/factories/users';
import { server } from '../../mocks/server';
import { currentUrl, renderRoute } from '../../utils/renderRoute';

const jane = buildUser({ firstName: 'Jane', lastName: 'Doe' });

/** A refresh token from an earlier visit (as if the page was just reloaded). */
function storedSessionFromEarlierVisit(token = 'STORED') {
  window.localStorage.setItem(
    REFRESH_TOKEN_STORAGE_KEY,
    JSON.stringify({ token, expiresAtUtc: '2099-01-01T00:00:00Z' }),
  );
}

/** Signed in during this visit: tokens in storage/memory AND the user in React state. */
function signedInNow(overrides: Parameters<typeof buildAuthResponse>[1] = {}) {
  setSession(buildAuthResponse(jane, { refreshToken: 'CURRENT', ...overrides }));
  return { user: jane };
}

function fireStorageEvent(init: StorageEventInit) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: REFRESH_TOKEN_STORAGE_KEY, ...init }));
  });
}

describe('Restoring the session on startup', () => {
  it('silently signs back in after a reload and stays on the requested page', async () => {
    storedSessionFromEarlierVisit();
    let refreshBody: unknown;
    let releaseRefresh: (() => void) | undefined;
    const loaderSeen = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    server.use(
      http.post(apiUrl('/api/auth/refresh'), async ({ request }) => {
        refreshBody = await request.json();
        // Answer only once the test has SEEN the loader (a fixed delay is a race when the machine is busy).
        await loaderSeen;
        return HttpResponse.json(buildAuthResponse(jane, { refreshToken: 'ROTATED' }));
      }),
    );

    const { router } = renderRoute('/projects/7');

    expect(await screen.findByText('Checking your session')).toBeInTheDocument();
    releaseRefresh?.();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Website Redesign' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/projects/7');
    expect(refreshBody).toEqual({ refreshToken: 'STORED' });
    expect(getRefreshToken()).toBe('ROTATED');
    expect(screen.getByRole('button', { name: 'Account menu for Jane Doe' })).toBeInTheDocument();
  });

  it('sends exactly one refresh even under StrictMode', async () => {
    storedSessionFromEarlierVisit();
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(jane)),
    );

    renderRoute('/dashboard', { strict: true });

    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    expect(refreshCalls).toHaveLength(1);
  });

  it('asks to sign in again (and remembers the page) when the stored session was revoked', async () => {
    storedSessionFromEarlierVisit('REVOKED');
    server.use(http.post(apiUrl('/api/auth/refresh'), () => problem(401)));

    const { router } = renderRoute('/projects/7');

    expect(await screen.findByText(/Your session has expired/)).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login?returnUrl=%2Fprojects%2F7');
    expect(getRefreshToken()).toBeNull();
  });

  it('keeps the session and offers a retry when the server is unreachable at startup', async () => {
    storedSessionFromEarlierVisit();
    let online = false;
    server.use(
      http.post(apiUrl('/api/auth/refresh'), () =>
        online ? HttpResponse.json(buildAuthResponse(jane)) : HttpResponse.error(),
      ),
    );
    const { user } = renderRoute('/dashboard');

    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't restore your session" }),
    ).toBeInTheDocument();
    expect(getRefreshToken()).toBe('STORED'); // not thrown away

    online = true;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });

  it('skips the check entirely when nothing is stored', async () => {
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse()),
    );

    renderRoute('/dashboard');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(refreshCalls).toHaveLength(0);
  });
});

describe('While signed in', () => {
  it('refreshes an expired access token transparently and completes the action', async () => {
    const { user: signedIn } = signedInNow({ accessToken: 'EXPIRED' });
    server.use(
      http.post(apiUrl('/api/account/change-password'), ({ request }) =>
        request.headers.get('Authorization') === 'Bearer FRESH'
          ? new HttpResponse(null, { status: 204 })
          : problem(401),
      ),
    );
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(jane, { accessToken: 'FRESH' })),
    );
    const { user } = renderRoute('/settings/security', { user: signedIn });

    await user.type(await screen.findByLabelText('Current password'), 'Old!Pass1');
    await user.type(screen.getByLabelText('New password'), 'N3w!Password');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Password');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText(/Your password was changed/)).toBeInTheDocument();
    expect(refreshCalls).toHaveLength(1);
  });

  it('sends the user to sign in, back to the same page afterwards, when the session expires mid-use', async () => {
    const { user: signedIn } = signedInNow({ accessToken: 'EXPIRED' });
    server.use(
      http.post(apiUrl('/api/account/change-password'), () => problem(401)),
      http.post(apiUrl('/api/auth/refresh'), () => problem(401)),
    );
    const { user, router } = renderRoute('/settings/security', { user: signedIn });

    await user.type(await screen.findByLabelText('Current password'), 'Old!Pass1');
    await user.type(screen.getByLabelText('New password'), 'N3w!Password');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Password');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText(/Your session has expired/)).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login?returnUrl=%2Fsettings%2Fsecurity');
  });

  it('stores the refresh token on sign-in so a reload can restore the session', async () => {
    const { user } = renderRoute('/login');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    expect(getRefreshToken()).toBe('test-refresh-token');
  });

  it('signs out of all devices from Settings › Security', async () => {
    const { user: signedIn } = signedInNow({ accessToken: 'ACCESS-1' });
    const calls = captureRequests(
      'post',
      '/api/auth/logout-all',
      () => new HttpResponse(null, { status: 204 }),
    );
    const { user, router } = renderRoute('/settings/security', { user: signedIn });

    await user.click(await screen.findByRole('button', { name: 'Sign out of all devices' }));
    await user.click(await screen.findByRole('button', { name: 'Sign out everywhere' }));

    expect(await screen.findByText('You were signed out on all devices.')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login');
    expect(calls[0]?.authorization).toBe('Bearer ACCESS-1');
    expect(getRefreshToken()).toBeNull();
  });
});

describe('Proactive refresh', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes shortly before the access token expires, without any failed request', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'], shouldAdvanceTime: true });
    const expiresInSixtyFiveSeconds = new Date(Date.now() + 65_000).toISOString();
    const { user: signedIn } = signedInNow({ accessTokenExpiresAtUtc: expiresInSixtyFiveSeconds });
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(jane, { accessToken: 'PROACTIVE' })),
    );
    renderRoute('/dashboard', { user: signedIn });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    expect(refreshCalls).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(5_100); // 65 s − 60 s lead
    });

    await waitFor(() => {
      expect(refreshCalls).toHaveLength(1);
    });
    await waitFor(() => {
      expect(getAccessToken()).toBe('PROACTIVE');
    });
  });
});

describe('Other tabs', () => {
  it('signs out here when another tab signs out', async () => {
    const { user: signedIn } = signedInNow();
    const { router } = renderRoute('/projects', { user: signedIn });
    await screen.findByRole('heading', { level: 1, name: 'Projects' });

    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY); // what the other tab did
    fireStorageEvent({ oldValue: '{"token":"CURRENT"}', newValue: null });

    expect(await screen.findByText('You signed out in another tab.')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login');
    expect(getAccessToken()).toBeNull();
  });

  it('signs in here when another tab signs in', async () => {
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(jane)),
    );
    renderRoute('/login');
    await screen.findByRole('heading', { level: 1, name: 'Welcome back' });

    storedSessionFromEarlierVisit('FROM-OTHER-TAB');
    fireStorageEvent({ oldValue: null, newValue: '{"token":"FROM-OTHER-TAB"}' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(refreshCalls[0]?.body).toEqual({ refreshToken: 'FROM-OTHER-TAB' });
  });

  it('ignores token rotations made by other tabs (nothing to do here)', async () => {
    const { user: signedIn } = signedInNow();
    const refreshCalls = captureRequests('post', '/api/auth/refresh', () =>
      HttpResponse.json(buildAuthResponse(jane)),
    );
    renderRoute('/dashboard', { user: signedIn });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    fireStorageEvent({ oldValue: '{"token":"CURRENT"}', newValue: '{"token":"ROTATED"}' });

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(refreshCalls).toHaveLength(0);
  });
});
