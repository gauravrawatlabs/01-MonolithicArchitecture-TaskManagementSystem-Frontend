import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

/**
 * Projects against the REAL API.
 *   • Always: a regular user sees the real (empty) list, cannot create, cannot search users, and gets the
 *     "not found" page for a project they're not in. The API itself refuses the writes (403).
 *   • With E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (a verified Admin): create → real 409 → add a member found
 *     through the real lookup → remove them → delete. Credentials come from the environment only.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const API = 'http://localhost:5075';
const PASSWORD = 'E2e!Passw0rd';

async function registerUser(request: APIRequestContext, firstName: string) {
  const email = `e2e-proj-${firstName.toLowerCase()}-${Date.now()}@example.test`;
  const response = await request.post(`${API}/api/auth/register`, {
    data: { email, password: PASSWORD, firstName, lastName: 'Tester' },
  });
  expect(response.status()).toBe(201);
  return email;
}

async function signIn(page: Page, email: string, password: string, path: string) {
  await page.goto(path);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
}

test('a regular user: real empty list, no create, no lookup, 404 page, and the API refuses writes', async ({
  page,
  request,
}) => {
  const email = await registerUser(request, 'Reggie');

  const list = page.waitForResponse((r) => r.url().startsWith(`${API}/api/projects?`));
  await signIn(page, email, PASSWORD, '/projects');
  expect((await list).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0);

  await page.goto('/projects/2147483647');
  await expect(page.getByRole('heading', { name: 'Project not found' })).toBeVisible();

  // Bypass the UI: the backend must refuse on its own.
  const login = await request.post(`${API}/api/auth/login`, {
    data: { email, password: PASSWORD },
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const create = await request.post(`${API}/api/projects`, {
    headers,
    data: { name: `Nope ${Date.now()}` },
  });
  expect(create.status()).toBe(403);
  const lookup = await request.get(`${API}/api/users/lookup?Search=e2e`, { headers });
  expect(lookup.status()).toBe(403);
});

test('admin: create, duplicate (409), add and remove a member, delete', async ({
  page,
  request,
}) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (a verified Admin) to run this.',
  );
  test.slow();
  const memberEmail = await registerUser(request, 'Mira');
  const name = `E2E Project ${Date.now()}`;
  await signIn(page, ADMIN_EMAIL ?? '', ADMIN_PASSWORD ?? '', '/projects');

  await page.getByRole('button', { name: 'New project' }).first().click();
  let dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).first().click();
  dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Name').fill(name.toUpperCase());
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(dialog.getByText(/already has a project named/)).toBeVisible(); // real per-owner unique index
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('link', { name }).first().click();
  await page.getByRole('link', { name: 'Members (1)' }).click();
  const picker = page.getByRole('combobox', { name: 'Add a member' });
  await picker.fill(memberEmail);
  await page.getByRole('option', { name: /Mira Tester/ }).click();
  await expect(page.getByRole('link', { name: 'Members (2)' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove Mira Tester' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove member' }).click();
  await expect(page.getByRole('link', { name: 'Members (1)' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete project' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
});
