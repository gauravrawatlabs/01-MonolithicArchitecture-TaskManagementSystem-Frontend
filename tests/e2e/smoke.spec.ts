import { expect, test } from '@playwright/test';

test('the app loads and sends a signed-out visitor to sign in', async ({ page }) => {
  await page.goto('/');

  // "/" → /dashboard → not signed in → /login, remembering where the visitor was going.
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fdashboard$/);
  await expect(page).toHaveTitle('Sign in · Task Management System');
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
});
