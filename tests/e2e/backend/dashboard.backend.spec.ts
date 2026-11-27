import { expect, test } from '@playwright/test';

/**
 * Real API: GET /api/dashboard for a brand-new user (role User, no projects). Verifies the real
 * contract end to end (auth header, enum-keyed dictionaries, empty scope) without needing an admin.
 * Creates one e2e-…@example.test user in the development database.
 */
test('a new user sees the empty dashboard from the real API', async ({ page }) => {
  const email = `e2e-dash-${Date.now()}@example.test`;
  const password = 'E2e!Passw0rd';

  await page.goto('/register');
  await page.getByLabel('First name').fill('Dana');
  await page.getByLabel('Last name').fill('Dashboard');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible();

  const dashboardResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/dashboard'),
  );
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const response = await dashboardResponse;
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    projectCount: number;
    tasksByStatus: Record<string, number>;
  };
  expect(body.projectCount).toBe(0);
  expect(Object.keys(body.tasksByStatus)).toEqual([
    'Todo',
    'InProgress',
    'InReview',
    'Done',
    'Cancelled',
  ]);

  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  await expect(page.getByText(/Ask a project owner or manager to add you/)).toBeVisible();
});
