import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';

/**
 * Signs in with the TEMPORARY development preview accounts (Phase 5 only). The session lives in
 * memory, so tests navigate by clicking (a full page load would sign out). Phase 7 replaces this
 * with the real login against the API.
 */
async function previewSignIn(
  page: Page,
  account: 'Admin' | 'Manager' | 'User',
  path = '/dashboard',
) {
  await page.goto(path);
  await page.getByRole('button', { name: `Continue as ${account}`, exact: true }).click();
  // Wait for the signed-in shell (the account menu exists at every screen size). Without this,
  // checks like isVisible() below would run while the next page is still loading.
  await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
}

/**
 * Desktop and tablet show the sidebar; phones open it as a drawer first.
 * Call only after the shell has rendered: isVisible() checks immediately and does not wait.
 */
async function openNavigation(page: Page) {
  const menuButton = page.getByRole('button', { name: 'Open navigation' });
  if (await menuButton.isVisible()) {
    await menuButton.click();
    return page.getByRole('dialog', { name: 'Navigation' });
  }
  return page.getByRole('navigation', { name: 'Main' });
}

test.describe('Navigation and guards', () => {
  test('redirects to sign in and returns to the requested page', async ({ page }) => {
    await page.goto('/projects/12/board');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fprojects%2F12%2Fboard$/);

    await page.getByRole('button', { name: 'Continue as Manager' }).click();

    await expect(page).toHaveURL(/\/projects\/12\/board$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Project #12' })).toBeVisible();
    await expect(page).toHaveTitle('Board · Task Management System');
  });

  test('a regular user does not see Admin navigation and is denied admin pages', async ({
    page,
  }) => {
    await previewSignIn(page, 'User');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    const nav = await openNavigation(page);
    await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
  });

  test('an admin can reach the users page from the navigation', async ({ page }) => {
    await previewSignIn(page, 'Admin');

    const nav = await openNavigation(page);
    await nav.getByRole('link', { name: 'Users' }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  });

  test('signing out returns to the sign-in page', async ({ page }) => {
    await previewSignIn(page, 'User');

    await page.getByRole('button', { name: /Account menu for/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Accessibility of the app shell', () => {
  test('sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('signed-in shell in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await previewSignIn(page, 'Admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('signed-in shell in dark mode, with the verify-email banner', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Continue as User (email not verified)' }).click();
    await expect(page.getByText('Please verify your email address')).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });
});
