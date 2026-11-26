import { expect, type Page } from '@playwright/test';

const API = 'http://localhost:5075';
const CORS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Expose-Headers': 'X-Correlation-ID',
};

/**
 * Fakes one API endpoint in the real browser (UI tests that run without the backend).
 * The browser applies CORS to fulfilled responses exactly as to the real API, so the
 * preflight (OPTIONS) and the Access-Control headers are part of the fake.
 */
export async function fakeApi(
  page: Page,
  path: string,
  status: number,
  body?: unknown,
): Promise<void> {
  await page.route(`${API}${path}`, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...CORS,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
      return;
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: CORS,
      body: body === undefined ? '' : JSON.stringify(body),
    });
  });
}

export interface FakeUser {
  firstName: string;
  lastName: string;
  roles: string[];
  emailConfirmed?: boolean;
}

/** A backend AuthResponse for the fake user (shape of the real DTO). */
export function fakeAuthResponse({ firstName, lastName, roles, emailConfirmed = true }: FakeUser) {
  return {
    accessToken: 'e2e-access-token',
    tokenType: 'Bearer',
    accessTokenExpiresAtUtc: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: 'e2e-refresh-token',
    refreshTokenExpiresAtUtc: new Date(Date.now() + 7 * 24 * 3_600_000).toISOString(),
    user: {
      id: '00000000-0000-4000-8000-0000000000e2',
      email: `${firstName.toLowerCase()}@example.test`,
      firstName,
      lastName,
      jobTitle: null,
      emailConfirmed,
      isActive: true,
      roles,
      createdAtUtc: '2026-11-01T09:00:00Z',
      lastLoginAtUtc: null,
    },
  };
}

export const FAKE_USERS = {
  admin: { firstName: 'Ada', lastName: 'Admin', roles: ['Admin'] },
  manager: { firstName: 'Max', lastName: 'Manager', roles: ['Manager'] },
  user: { firstName: 'Uma', lastName: 'User', roles: ['User'] },
  unverified: { firstName: 'Nina', lastName: 'Newcomer', roles: ['User'], emailConfirmed: false },
} satisfies Record<string, FakeUser>;

/**
 * Signs in through the REAL login form against a faked auth API (login, refresh, logout), then
 * waits for the signed-in shell. Opens `path` first, so the guard's redirect + returnUrl are exercised.
 */
export async function signInWithFakeApi(
  page: Page,
  fakeUser: FakeUser,
  path = '/dashboard',
): Promise<void> {
  const auth = fakeAuthResponse(fakeUser);
  await fakeApi(page, '/api/auth/login', 200, auth);
  await fakeApi(page, '/api/auth/refresh', 200, auth);
  await fakeApi(page, '/api/auth/logout', 204);

  await page.goto(path);
  await page.getByLabel('Email').fill(auth.user.email);
  await page.getByLabel('Password', { exact: true }).fill('Fake!Passw0rd');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
}
