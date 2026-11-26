import { expect, test } from '@playwright/test';

test('the app loads with its title and main heading', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Task Management System');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
