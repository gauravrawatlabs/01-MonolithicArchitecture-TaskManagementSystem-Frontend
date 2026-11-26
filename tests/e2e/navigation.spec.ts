import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { FAKE_USERS, signInWithFakeApi } from './support/fakeApi';

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

    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects/12/board');

    await expect(page).toHaveURL(/\/projects\/12\/board$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Project #12' })).toBeVisible();
    await expect(page).toHaveTitle('Board · Task Management System');
  });

  test('a regular user does not see Admin navigation and is denied admin pages', async ({
    page,
  }) => {
    await signInWithFakeApi(page, FAKE_USERS.user);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    const nav = await openNavigation(page);
    await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
  });

  test('an admin can reach the users page from the navigation', async ({ page }) => {
    await signInWithFakeApi(page, FAKE_USERS.admin);

    const nav = await openNavigation(page);
    await nav.getByRole('link', { name: 'Users' }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  });

  test('signing out returns to the sign-in page', async ({ page }) => {
    await signInWithFakeApi(page, FAKE_USERS.user);

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
    await signInWithFakeApi(page, FAKE_USERS.admin);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('signed-in shell in dark mode, with the verify-email banner', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await signInWithFakeApi(page, FAKE_USERS.unverified);
    await expect(page.getByText('Please verify your email address')).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });
});
