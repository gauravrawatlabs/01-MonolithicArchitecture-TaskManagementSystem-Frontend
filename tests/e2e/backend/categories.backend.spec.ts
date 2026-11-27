import { expect, type Page, test } from '@playwright/test';

/**
 * Categories against the REAL API.
 *   • Always: a regular user reads the real list, sees no management controls, and the API itself
 *     answers 403 to a write (the UI hiding buttons is not the security boundary).
 *   • With E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (a verified Admin, e.g. the seeded one): the full
 *     create → duplicate (409) → rename → delete flow. Credentials come from the environment only.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const API = 'http://localhost:5075';

async function signIn(page: Page, email: string, password: string, path = '/categories') {
  await page.goto(path);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible();
}

test('a regular user reads categories, and the API refuses writes with 403', async ({
  page,
  request,
}) => {
  const email = `e2e-cat-${Date.now()}@example.test`;
  const password = 'E2e!Passw0rd';
  const registered = await request.post(`${API}/api/auth/register`, {
    data: { email, password, firstName: 'Cora', lastName: 'Category' },
  });
  expect(registered.status()).toBe(201);

  const listResponse = page.waitForResponse((r) => r.url() === `${API}/api/categories`);
  await signIn(page, email, password);
  expect((await listResponse).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'New category' })).toHaveCount(0);

  // Bypass the UI: the backend must refuse on its own.
  const login = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const write = await request.post(`${API}/api/categories`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name: `Hacked-${Date.now()}` },
  });
  expect(write.status()).toBe(403);
});

test('admin: create, duplicate (409), rename and delete a category', async ({ page }) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (a verified Admin) to run this.',
  );
  const name = `E2E ${Date.now()}`;
  await signIn(page, ADMIN_EMAIL ?? '', ADMIN_PASSWORD ?? '');
  const table = page.getByRole('table', { name: 'Categories' });

  await page.getByRole('button', { name: 'New category' }).first().click();
  let dialog = page.getByRole('dialog', { name: 'New category' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('button', { name: 'Create category' }).click();
  await expect(table.getByText(name, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'New category' }).first().click();
  dialog = page.getByRole('dialog', { name: 'New category' });
  await dialog.getByLabel('Name').fill(name.toUpperCase());
  await dialog.getByRole('button', { name: 'Create category' }).click();
  await expect(dialog.getByText(/already exists/)).toBeVisible(); // real case-insensitive unique index
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  dialog = page.getByRole('dialog', { name: 'Edit category' });
  await dialog.getByLabel('Name').fill(`${name} renamed`);
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(table.getByText(`${name} renamed`, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: `Actions for ${name} renamed` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete category' }).click();
  await expect(table.getByText(`${name} renamed`, { exact: true })).toHaveCount(0);
});
