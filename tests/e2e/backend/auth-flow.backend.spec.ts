import { expect, type Page, test } from '@playwright/test';

import { readEmailLink } from '../support/emails';

/**
 * REAL end-to-end flow against the running ASP.NET Core API (npm run test:e2e:backend).
 * Requires: backend on http://localhost:5075 in Development (emails written to its pickup folder).
 * Creates a unique e2e-…@example.test user in the backend's development database.
 *
 * Phase 6 keeps the session in memory, so the test moves around by clicking (a full page load
 * would sign out). Phase 7 adds persistence.
 */
const PASSWORD = 'E2e!Passw0rd';
const NEW_PASSWORD = 'E2e!N3wPassword';

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('register → confirm email → sign in → change password → sign in again → reset password', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = `e2e-${Date.now()}@example.test`;

  // 1. Register
  await page.goto('/register');
  await page.getByLabel('First name').fill('Erin');
  await page.getByLabel('Last name').fill('Endtoend');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible();

  // 2. Confirm with the link from the real email
  await page.goto(await readEmailLink(email, '/confirm-email'));
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible();

  // 3. Sign in: verified account, no banner
  await page.getByRole('link', { name: 'Sign in' }).click();
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Please verify your email address')).toHaveCount(0);

  // 4. Change password (Settings › Security) → signed out everywhere
  await page.getByRole('button', { name: 'Account menu for Erin Endtoend' }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await page
    .getByRole('navigation', { name: 'Settings sections' })
    .getByRole('link', { name: 'Security' })
    .click();
  await page.getByLabel('Current password').fill('Wrong!Pass1');
  await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Confirm new password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('The current password is incorrect.')).toBeVisible(); // real 400 from Identity

  await page.getByLabel('Current password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(
    page.getByText(/Your password was changed and you were signed out everywhere/),
  ).toBeVisible();

  // 5. The old password no longer works; the new one does
  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  await signIn(page, email, NEW_PASSWORD);
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

  // 6. Sign out, then reset the password through the real email link
  await page.getByRole('button', { name: 'Account menu for Erin Endtoend' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible();

  await page.goto(await readEmailLink(email, '/reset-password'));
  await page.getByLabel('New password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm new password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(
    page.getByText('Your password has been reset. Sign in with your new password.'),
  ).toBeVisible();

  await signIn(page, email, PASSWORD);
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});
