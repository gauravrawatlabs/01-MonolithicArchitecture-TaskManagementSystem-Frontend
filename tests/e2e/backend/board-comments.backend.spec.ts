import { type APIRequestContext, expect, type Page, test } from '@playwright/test';

import { readEmailLink } from '../support/emails';

/**
 * Board and comments against the REAL API.
 *   • Always: a regular user. Unverified: the board picker shows no projects, and commenting is refused
 *     (403, EmailVerified). After confirming the email (real link): commenting on a task they can't see is 404.
 *   • With E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD: a fresh project with a verified member and a task. The admin
 *     moves the card on the real board; the member comments; the admin can delete the member's comment but
 *     the API refuses an edit (author only, 403). Cleaned up afterwards.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const API = 'http://localhost:5075';
const PASSWORD = 'E2e!Passw0rd';

async function register(request: APIRequestContext, firstName: string) {
  const email = `e2e-board-${firstName.toLowerCase()}-${Date.now()}@example.test`;
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

test('a regular user: verification first (403), then visibility (404), for comments', async ({
  page,
  request,
}) => {
  const email = await register(request, 'Cleo');
  await signIn(page, email, PASSWORD, '/board');
  await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();

  let { headers } = await token(request, email, PASSWORD);
  const comment = { content: 'Hello?' };
  expect(
    (
      await request.post(`${API}/api/tasks/2147483647/comments`, { headers, data: comment })
    ).status(),
  ).toBe(403);

  await page.goto(await readEmailLink(email, '/confirm-email'));
  await expect(page.getByRole('heading', { level: 1, name: 'Email confirmed' })).toBeVisible();
  ({ headers } = await token(request, email, PASSWORD));
  expect(
    (
      await request.post(`${API}/api/tasks/2147483647/comments`, { headers, data: comment })
    ).status(),
  ).toBe(404);
});

test('admin + member: move a card on the real board, discuss, moderation rules', async ({
  browser,
  request,
}) => {
  test.skip(
    !ADMIN_EMAIL || !ADMIN_PASSWORD,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (a verified Admin) to run this.',
  );
  test.slow();
  const admin = await token(request, ADMIN_EMAIL ?? '', ADMIN_PASSWORD ?? '');
  const memberEmail = await register(request, 'Milo');
  const memberPage = await (await browser.newContext()).newPage();
  await memberPage.goto(await readEmailLink(memberEmail, '/confirm-email'));
  const member = await token(request, memberEmail, PASSWORD);

  const project = (await (
    await request.post(`${API}/api/projects`, {
      headers: admin.headers,
      data: { name: `E2E Board ${Date.now()}`, description: null, startDate: null, endDate: null },
    })
  ).json()) as { id: number };
  try {
    await request.post(`${API}/api/projects/${project.id}/members`, {
      headers: admin.headers,
      data: { userId: member.userId },
    });
    const task = (await (
      await request.post(`${API}/api/tasks`, {
        headers: admin.headers,
        data: {
          projectId: project.id,
          title: 'E2E board card',
          description: null,
          priority: 'High',
          dueDateUtc: null,
          categoryId: null,
        },
      })
    ).json()) as { id: number };

    // Admin moves the card on the real board.
    const adminPage = await (await browser.newContext()).newPage();
    await signIn(
      adminPage,
      ADMIN_EMAIL ?? '',
      ADMIN_PASSWORD ?? '',
      `/projects/${project.id}/board`,
    );
    await adminPage.getByRole('button', { name: 'Move E2E board card to…' }).click();
    await adminPage.getByRole('menuitem', { name: 'In progress' }).click();
    await expect(
      adminPage
        .getByRole('region', { name: 'In progress', exact: true })
        .getByRole('article', { name: 'E2E board card' }),
    ).toBeVisible();
    await adminPage.reload(); // the server really has it
    await expect(
      adminPage
        .getByRole('region', { name: 'In progress', exact: true })
        .getByRole('article', { name: 'E2E board card' }),
    ).toBeVisible();

    // The member comments through the UI.
    await signIn(memberPage, memberEmail, PASSWORD, `/tasks/${task.id}`);
    await memberPage.getByLabel('Add a comment').fill('Started on this.');
    await memberPage.getByRole('button', { name: 'Comment' }).click();
    await expect(memberPage.getByRole('heading', { name: 'Comments (1)' })).toBeVisible();

    // The admin sees Delete but not Edit, and the API agrees: editing someone else's words is a 403.
    await adminPage.goto(`/tasks/${task.id}`);
    await expect(
      adminPage.getByRole('button', { name: 'Delete comment by Milo Tester' }),
    ).toBeVisible();
    await expect(adminPage.getByRole('button', { name: /^Edit comment/ })).toHaveCount(0);
    const comments = (await (
      await request.get(`${API}/api/tasks/${task.id}/comments`, { headers: admin.headers })
    ).json()) as { items: { id: number }[] };
    const commentId = comments.items[0]?.id ?? 0;
    expect(
      (
        await request.put(`${API}/api/comments/${commentId}`, {
          headers: admin.headers,
          data: { content: 'Edited by admin' },
        })
      ).status(),
    ).toBe(403);
    await adminPage.getByRole('button', { name: 'Delete comment by Milo Tester' }).click();
    await adminPage
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete comment' })
      .click();
    await expect(adminPage.getByRole('heading', { name: 'Comments (0)' })).toBeVisible();
  } finally {
    await request.delete(`${API}/api/projects/${project.id}`, { headers: admin.headers });
  }
});
