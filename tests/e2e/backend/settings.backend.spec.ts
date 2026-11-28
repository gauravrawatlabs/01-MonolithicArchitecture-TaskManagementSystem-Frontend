import { expect, test } from '@playwright/test';

import { readEmailLink } from '../support/emails';

/**
 * Settings against the REAL API: an unverified user follows the banner to Settings › Account, asks for a new
 * confirmation email (real POST /api/account/resend-confirmation; the cooldown starts), opens the NEWEST link
 * from the backend's email pickup folder, and comes back verified: no banner, "Verified", profile editable.
 */
const API = 'http://localhost:5075';
const PASSWORD = 'E2e!Passw0rd';

test('resend the confirmation email from Settings › Account, confirm, and come back verified', async ({
  page,
  request,
}) => {
  test.slow();
  const email = `e2e-settings-${Date.now()}@example.test`;
  expect(
    (
      await request.post(`${API}/api/auth/register`, {
        data: { email, password: PASSWORD, firstName: 'Sam', lastName: 'Settings' },
      })
    ).status(),
  ).toBe(201);

  await page.goto('/dashboard');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByRole('link', { name: 'Resend the email' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings · Account' })).toBeVisible();
  const resent = page.waitForResponse((r) => r.url() === `${API}/api/account/resend-confirmation`);
  await page.getByRole('button', { name: 'Resend confirmation email' }).click();
  expect((await resent).ok()).toBe(true);
  await expect(page.getByText('Confirmation email sent', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend available in/ })).toBeDisabled();

  await page.goto(await readEmailLink(email, '/confirm-email'));
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible();

  await page.goto('/settings/account');
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
  await expect(page.getByText('Please verify your email address')).toHaveCount(0);
  await page.goto('/profile');
  await expect(page.getByLabel('First name')).toBeEnabled();
});
