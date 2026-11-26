import { type Browser, expect, type Page, test } from '@playwright/test';

import { readEmailLink } from '../support/emails';

/**
 * REAL session behaviour against the running API (npm run test:e2e:backend):
 * persistence across reloads, two tabs sharing one session, cross-tab sign-out, and
 * "sign out of all devices" ending a session in a DIFFERENT browser.
 * Creates one e2e-…@example.test user in the development database.
 */
const PASSWORD = 'E2e!Passw0rd';

async function registerAndConfirm(page: Page, email: string) {
  await page.goto('/register');
  await page.getByLabel('First name').fill('Sam');
  await page.getByLabel('Last name').fill('Session');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible();
  await page.goto(await readEmailLink(email, '/confirm-email'));
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible();
}

async function signIn(page: Page, email: string, path = '/dashboard') {
  await page.goto(path);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Account menu for Sam Session' })).toBeVisible();
}

async function newBrowserContextPage(browser: Browser) {
  const context = await browser.newContext({ baseURL: 'http://localhost:3000' });
  return { context, page: await context.newPage() };
}

test('reload, second tab, cross-tab sign-out, and sign-out of all devices', async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(120_000);
  const email = `e2e-session-${Date.now()}@example.test`;
  await registerAndConfirm(page, email);

  // 1. Signed in → reload → still signed in (real silent refresh with token rotation)
  await signIn(page, email, '/projects');
  const tokenBefore = await page.evaluate(() => window.localStorage.getItem('tms.refreshToken'));
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  const tokenAfter = await page.evaluate(() => window.localStorage.getItem('tms.refreshToken'));
  expect(tokenAfter).not.toEqual(tokenBefore); // rotated by the backend

  // 2. A second tab shares the session (same localStorage) without signing in again
  const secondTab = await context.newPage();
  await secondTab.goto('/tasks');
  await expect(secondTab.getByRole('heading', { level: 1, name: 'All tasks' })).toBeVisible();

  // 3. Both tabs refresh again (reloads): the lock + re-read keeps the session alive (no reuse revocation)
  await Promise.all([page.reload(), secondTab.reload()]);
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  await expect(secondTab.getByRole('heading', { level: 1, name: 'All tasks' })).toBeVisible();

  // 4. Signing out in one tab signs out the other
  await page.getByRole('button', { name: 'Account menu for Sam Session' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(secondTab.getByText('You signed out in another tab.')).toBeVisible();

  // 5. "Sign out of all devices" ends a session in a DIFFERENT browser (no shared storage)
  const other = await newBrowserContextPage(browser);
  await signIn(other.page, email);
  await signIn(page, email, '/settings/security');
  await page.getByRole('button', { name: 'Sign out of all devices' }).click();
  await page.getByRole('button', { name: 'Sign out everywhere' }).click();
  await expect(page.getByText('You were signed out on all devices.')).toBeVisible();

  await other.page.reload(); // its refresh token was revoked on the server
  await expect(other.page.getByText(/Your session has expired/)).toBeVisible();
  await other.context.close();
});
