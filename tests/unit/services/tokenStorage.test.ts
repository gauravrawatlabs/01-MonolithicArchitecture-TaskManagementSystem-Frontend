import { describe, expect, it } from 'vitest';

import {
  clearAccessToken,
  clearSession,
  getAccessToken,
  getRefreshToken,
  REFRESH_TOKEN_STORAGE_KEY,
  setSession,
} from '@/services/tokenStorage';

import { buildAuthResponse } from '../../mocks/factories/auth';

describe('tokenStorage (decision A1)', () => {
  it('keeps the access token in memory only and persists the refresh token', () => {
    setSession(buildAuthResponse(undefined, { accessToken: 'ACCESS', refreshToken: 'REFRESH' }));

    expect(getAccessToken()).toBe('ACCESS');
    expect(getRefreshToken()).toBe('REFRESH');
    const stored = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? '';
    expect(stored).toContain('REFRESH');
    expect(stored).not.toContain('ACCESS'); // a storage dump can't call the API directly
  });

  it('reads the refresh token from storage every time (another tab may have rotated it)', () => {
    setSession(buildAuthResponse(undefined, { refreshToken: 'R1' }));

    window.localStorage.setItem(
      REFRESH_TOKEN_STORAGE_KEY,
      JSON.stringify({ token: 'R2', expiresAtUtc: '2099-01-01T00:00:00Z' }),
    );

    expect(getRefreshToken()).toBe('R2');
  });

  it('ignores an expired, malformed or missing stored token', () => {
    window.localStorage.setItem(
      REFRESH_TOKEN_STORAGE_KEY,
      JSON.stringify({ token: 'OLD', expiresAtUtc: '2000-01-01T00:00:00Z' }),
    );
    expect(getRefreshToken()).toBeNull();

    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, '{not json');
    expect(getRefreshToken()).toBeNull();

    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, JSON.stringify({ token: '' }));
    expect(getRefreshToken()).toBeNull();

    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    expect(getRefreshToken()).toBeNull();
  });

  it('clearAccessToken forgets only this tab; clearSession also removes the stored token', () => {
    setSession(buildAuthResponse());

    clearAccessToken();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).not.toBeNull();

    clearSession();
    expect(getRefreshToken()).toBeNull();
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
