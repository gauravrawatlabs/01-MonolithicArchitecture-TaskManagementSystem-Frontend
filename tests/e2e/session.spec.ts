import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { FAKE_USERS, fakeApi, fakeAuthResponse, signInWithFakeApi } from './support/fakeApi';

test.describe('Session lifecycle (faked API)', () => {
  test('stays signed in after a reload (refresh token in localStorage, access token re-issued)', async ({
    page,
  }) => {
    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects');
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Account menu for Max Manager' })).toBeVisible();
    const stored = await page.evaluate(() => window.localStorage.getItem('tms.refreshToken'));
    expect(stored).toContain('e2e-refresh-token');
    expect(stored).not.toContain('e2e-access-token');
  });

  test('a revoked session asks to sign in again and returns to the same page', async ({ page }) => {
    await signInWithFakeApi(page, FAKE_USERS.user, '/projects');
    await page.unroute('**/api/auth/refresh');
    await fakeApi(page, '/api/auth/refresh', 401, { title: 'Unauthorized', status: 401 });

    await page.reload();

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fprojects$/);
    await expect(page.getByText(/Your session has expired/)).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test('offline at startup: keeps the session and offers a retry', async ({ page }) => {
    await signInWithFakeApi(page, FAKE_USERS.user, '/dashboard');
    await page.unroute('**/api/auth/refresh');
    await page.route('**/api/auth/refresh', (route) => route.abort('internetdisconnected'));

    await page.reload();

    await expect(
      page.getByRole('heading', { level: 1, name: "We couldn't restore your session" }),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.unroute('**/api/auth/refresh');
    await fakeApi(page, '/api/auth/refresh', 200, fakeAuthResponse(FAKE_USERS.user));
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });
});
