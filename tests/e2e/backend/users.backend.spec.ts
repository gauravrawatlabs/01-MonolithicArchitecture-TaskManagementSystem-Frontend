import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

import { readEmailLink } from '../support/emails';

/**
 * Users and profile against the REAL API.
 *   • Always: a regular user. Unverified: profile edit refused (UI explains, API 403). Own account readable,
 *     someone else's and the directory are Admin-only (403). After confirming the email (real link): the
 *     profile saves for real and the app header follows.
 *   • With E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD: find a fresh user, change roles, deactivate (their sign-in
 *     then fails), reactivate; removing your own Admin role is refused (422).
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const API = 'http://localhost:5075';
const PASSWORD = 'E2e!Passw0rd';

async function register(request: APIRequestContext, firstName: string) {
  const email = `e2e-user-${firstName.toLowerCase()}-${Date.now()}@example.test`;
  const response = await request.post(`${API}/api/auth/register`, {
    data: { email, password: PASSWORD, firstName, lastName: 'Tester' },
  });
  expect(response.status()).toBe(201);
  return email;
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ status: number; headers: Record<string, string>; userId: string }> {
  const response = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  if (response.status() !== 200) return { status: response.status(), headers: {}, userId: '' };
  const body = (await response.json()) as { accessToken: string; user: { id: string } };
  return {
    status: 200,
    headers: { Authorization: `Bearer ${body.accessToken}` },
    userId: body.user.id,
  };
}

async function signIn(page: Page, email: string, password: string, path: string) {
  await page.goto(path);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
}

test('a regular user: own account only; profile edits need a verified email', async ({
  page,
  request,
}) => {
  const email = await register(request, 'Pia');
  const otherEmail = await register(request, 'Oli');
  const me = await login(request, email, PASSWORD);
  const other = await login(request, otherEmail, PASSWORD);

  expect(
    (await request.get(`${API}/api/users/${me.userId}`, { headers: me.headers })).status(),
  ).toBe(200);
  expect(
    (await request.get(`${API}/api/users/${other.userId}`, { headers: me.headers })).status(),
  ).toBe(403);
  expect((await request.get(`${API}/api/users`, { headers: me.headers })).status()).toBe(403);
  const profile = { firstName: 'Pia', lastName: 'Renamed', jobTitle: null };
  expect(
    (await request.put(`${API}/api/users/me`, { headers: me.headers, data: profile })).status(),
  ).toBe(403);

  await signIn(page, email, PASSWORD, '/profile');
  await expect(page.getByText('Verify your email address to change your profile.')).toBeVisible();

  await page.goto(await readEmailLink(email, '/confirm-email'));
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible();
  await page.goto('/profile');
  await page.getByLabel('Last name').fill('Renamed');
  await page.getByLabel('Job title').fill('QA Engineer');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Profile saved', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account menu for Pia Renamed' })).toBeVisible();
  await page.reload(); // the server really has it
  await expect(page.getByLabel('Job title')).toHaveValue('QA Engineer');
});

test('admin: roles, deactivate (sign-in then fails), reactivate; own Admin role protected', async ({
  page,
  request,
}) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (a verified Admin) to run this.',
  );
  test.slow();
  const email = await register(request, 'Zed');
  const admin = await login(request, ADMIN_EMAIL ?? '', ADMIN_PASSWORD ?? '');
  const selfDemote = await request.put(`${API}/api/users/${admin.userId}/roles`, {
    headers: admin.headers,
    data: { roles: ['User'] },
  });
  expect(selfDemote.status()).toBe(422);

  await signIn(page, ADMIN_EMAIL ?? '', ADMIN_PASSWORD ?? '', '/admin/users');
  await page.getByRole('searchbox', { name: 'Search users' }).fill(email);
  await page.getByRole('link', { name: 'Zed Tester' }).click();
  await page.getByRole('checkbox', { name: 'Manager' }).check();
  await page.getByRole('button', { name: 'Save roles' }).click();
  await expect(page.getByText('Roles updated', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Deactivate account' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByRole('button', { name: 'Reactivate account' })).toBeVisible();
  expect((await login(request, email, PASSWORD)).status).toBe(401);

  await page.getByRole('button', { name: 'Reactivate account' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reactivate' }).click();
  await expect(page.getByRole('button', { name: 'Deactivate account' })).toBeVisible();
  expect((await login(request, email, PASSWORD)).status).toBe(200);
});
