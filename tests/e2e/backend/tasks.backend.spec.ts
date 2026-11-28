import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

import { readEmailLink } from '../support/emails';

/**
 * Tasks against the REAL API.
 *   • Always: a regular user. Unverified: the UI explains and the API refuses task writes (403, EmailVerified).
 *     After confirming the email (real link): a project they're not in is a 404; a foreign task "not found".
 *   • With E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (a verified Admin): in a fresh project, create a task in the
 *     UI, walk the REAL status workflow, prove an invalid move is a 409, assign a member, then clean up.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const API = 'http://localhost:5075';
const PASSWORD = 'E2e!Passw0rd';

async function register(request: APIRequestContext, firstName: string) {
  const email = `e2e-task-${firstName.toLowerCase()}-${Date.now()}@example.test`;
  const response = await request.post(`${API}/api/auth/register`, {
    data: { email, password: PASSWORD, firstName, lastName: 'Tester' },
  });
  expect(response.status()).toBe(201);
  return email;
}

async function token(request: APIRequestContext, email: string, password: string) {
  const login = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  expect(login.status()).toBe(200);
  const body = (await login.json()) as { accessToken: string; user: { id: string } };
  return { headers: { Authorization: `Bearer ${body.accessToken}` }, userId: body.user.id };
}

async function signIn(page: Page, email: string, password: string, path: string) {
  await page.goto(path);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
}

test('a regular user: verified email first (403), then project membership (404), as the API layers them', async ({
  page,
  request,
}) => {
  const email = await register(request, 'Rita');
  const sneaky = {
    projectId: 2147483647,
    title: 'Sneaky',
    description: null,
    priority: null,
    dueDateUtc: null,
    categoryId: null,
  };

  // 1. Unverified: the UI explains, and every task write is refused by the EmailVerified policy.
  const list = page.waitForResponse((r) => r.url().startsWith(`${API}/api/tasks?`));
  await signIn(page, email, PASSWORD, '/tasks?assignedToMe=true');
  expect((await list).status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'My tasks' })).toBeVisible();
  await expect(
    page.getByText('Verify your email address to create or change tasks.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New task' })).toHaveCount(0);
  let { headers } = await token(request, email, PASSWORD);
  expect((await request.post(`${API}/api/tasks`, { headers, data: sneaky })).status()).toBe(403);

  // 2. Verified (real email link): now membership decides, and a foreign project "doesn't exist".
  await page.goto(await readEmailLink(email, '/confirm-email'));
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible();
  ({ headers } = await token(request, email, PASSWORD));
  expect((await request.post(`${API}/api/tasks`, { headers, data: sneaky })).status()).toBe(404);

  await page.goto('/tasks/2147483647');
  await expect(page.getByRole('heading', { name: 'Task not found' })).toBeVisible();
});

test('admin: create a task, real workflow (and a real 409), assign a member, clean up', async ({
  page,
  request,
}) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (a verified Admin) to run this.',
  );
  test.slow();
  const admin = await token(request, ADMIN_EMAIL ?? '', ADMIN_PASSWORD ?? '');
  const memberEmail = await register(request, 'Tomas');
  const member = await token(request, memberEmail, PASSWORD);
  const projectResponse = await request.post(`${API}/api/projects`, {
    headers: admin.headers,
    data: { name: `E2E Tasks ${Date.now()}`, description: null, startDate: null, endDate: null },
  });
  expect(projectResponse.status()).toBe(201);
  const project = (await projectResponse.json()) as { id: number };
  await request.post(`${API}/api/projects/${project.id}/members`, {
    headers: admin.headers,
    data: { userId: member.userId },
  });

  try {
    await signIn(page, ADMIN_EMAIL ?? '', ADMIN_PASSWORD ?? '', `/projects/${project.id}/tasks`);
    await page.getByRole('button', { name: 'New task' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'New task' });
    await dialog.getByLabel('Title').fill('E2E real task');
    await dialog.getByLabel('Assignee').selectOption({ label: 'Tomas Tester' });
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'E2E real task' })).toBeVisible();
    await expect(page.getByLabel('Assignee')).toHaveValue(member.userId);

    const taskId = Number(new URL(page.url()).pathname.split('/').pop());
    const invalid = await request.patch(`${API}/api/tasks/${taskId}/status`, {
      headers: admin.headers,
      data: { status: 'Done' }, // Todo → Done skips the workflow
    });
    expect(invalid.status()).toBe(409);

    const moves = page.getByRole('group', { name: 'Change status' });
    await moves.getByRole('button', { name: 'Start' }).click();
    await moves.getByRole('button', { name: 'Send to review' }).click();
    await moves.getByRole('button', { name: 'Mark done' }).click();
    await expect(moves.getByRole('button', { name: 'Reopen' })).toBeVisible();
  } finally {
    await request.delete(`${API}/api/projects/${project.id}`, { headers: admin.headers }); // cascades to tasks
  }
});
