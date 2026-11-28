import { type APIRequestContext, type Browser, expect, type Page, test } from '@playwright/test';

import { readEmailLink } from '../support/emails';

/**
 * The whole product, two people, the REAL API (Phase 1 §17 test plan, journeys J1–J5):
 *   Maya registers → confirms her email → (an Admin makes her a Manager) → creates a project → adds Leo →
 *   creates a task assigned to him → moves it on the board. Leo signs in → finds it in My tasks → starts it →
 *   comments. Maya sees the comment, then signs out.
 * Making someone a Manager needs an Admin, so this runs with E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD only.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const API = 'http://localhost:5075';
const PASSWORD = 'E2e!Passw0rd';

async function registerAndConfirm(page: Page, firstName: string) {
  const email = `e2e-journey-${firstName.toLowerCase()}-${Date.now()}@example.test`;
  await page.goto('/register');
  await page.getByLabel('First name').fill(firstName);
  await page.getByLabel('Last name').fill('Journey');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await page.goto(await readEmailLink(email, '/confirm-email'));
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible();
  return email;
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: /Account menu for/ })).toBeVisible();
}

async function makeManager(request: APIRequestContext, email: string) {
  const login = await request.post(`${API}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const headers = {
    Authorization: `Bearer ${((await login.json()) as { accessToken: string }).accessToken}`,
  };
  const found = (await (
    await request.get(`${API}/api/users?Search=${encodeURIComponent(email)}`, { headers })
  ).json()) as {
    items: { id: string }[];
  };
  const id = found.items[0]?.id ?? '';
  expect(
    (
      await request.put(`${API}/api/users/${id}/roles`, { headers, data: { roles: ['Manager'] } })
    ).status(),
  ).toBe(200);
  return headers;
}

async function newPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}

test('Maya plans, Leo works: project → member → task → board → comment → sign out', async ({
  browser,
  request,
}) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Needs an Admin to grant the Manager role: set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.',
  );
  test.setTimeout(180_000);
  const maya = await newPage(browser);
  const leo = await newPage(browser);
  const mayaEmail = await registerAndConfirm(maya, 'Maya');
  const leoEmail = await registerAndConfirm(leo, 'Leo');
  const adminHeaders = await makeManager(request, mayaEmail);
  const projectName = `Journey ${Date.now()}`;
  let projectId = 0;

  try {
    // Maya (now a Manager; signing in again picks up the role)
    await signIn(maya, mayaEmail);
    await maya.getByRole('link', { name: 'Projects' }).first().click();
    await maya.getByRole('button', { name: 'New project' }).first().click();
    await maya.getByRole('dialog').getByLabel('Name').fill(projectName);
    await maya.getByRole('dialog').getByRole('button', { name: 'Create project' }).click();
    await expect(maya.getByRole('heading', { level: 1, name: projectName })).toBeVisible();
    projectId = Number(new URL(maya.url()).pathname.split('/').pop());

    await maya.getByRole('link', { name: /^Members/ }).click();
    await maya.getByRole('combobox', { name: 'Add a member' }).fill(leoEmail);
    await maya.getByRole('option', { name: /Leo Journey/ }).click();
    await expect(maya.getByRole('link', { name: 'Members (2)' })).toBeVisible();

    await maya.getByRole('link', { name: 'Tasks', exact: true }).last().click();
    await maya.getByRole('button', { name: 'New task' }).click();
    const form = maya.getByRole('dialog', { name: 'New task' });
    await form.getByLabel('Title').fill('Write the launch post');
    await form.getByLabel('Priority').selectOption('High');
    await form.getByLabel('Assignee').selectOption({ label: 'Leo Journey' });
    await form.getByRole('button', { name: 'Create task' }).click();
    await expect(
      maya.getByRole('heading', { level: 1, name: 'Write the launch post' }),
    ).toBeVisible();
    const taskUrl = maya.url();

    // Leo finds it in My tasks and starts it from the board
    await signIn(leo, leoEmail);
    await leo.goto('/tasks?assignedToMe=true');
    await expect(leo.getByRole('link', { name: 'Write the launch post' })).toBeVisible();
    await leo.goto(`/projects/${projectId}/board`);
    await leo.getByRole('button', { name: 'Move Write the launch post to…' }).click();
    await leo.getByRole('menuitem', { name: 'In progress' }).click();
    await leo.reload();
    await expect(
      leo
        .getByRole('region', { name: 'In progress', exact: true })
        .getByRole('article', { name: 'Write the launch post' }),
    ).toBeVisible();
    await leo.goto(taskUrl);
    await leo.getByLabel('Add a comment').fill('Draft is in the shared folder.');
    await leo.getByRole('button', { name: 'Comment' }).click();
    await expect(leo.getByRole('heading', { name: 'Comments (1)' })).toBeVisible();

    // Maya sees it, then signs out
    await maya.goto(taskUrl);
    await expect(maya.getByText('Draft is in the shared folder.')).toBeVisible();
    await expect(maya.getByText('In progress').first()).toBeVisible();
    await maya.getByRole('button', { name: /Account menu for/ }).click();
    await maya.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(maya).toHaveURL(/\/login/);
  } finally {
    if (projectId)
      await request.delete(`${API}/api/projects/${projectId}`, { headers: adminHeaders });
  }
});
