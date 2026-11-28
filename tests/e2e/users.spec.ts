import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import {
  FAKE_USER_ID,
  FAKE_USERS,
  type FakeUser,
  fakeApiHandler,
  fakeAuthResponse,
  fakeEmptyWorkspace,
  signInWithFakeApi,
} from './support/fakeApi';
import { fakeTaskWorld } from './support/fakeTasks';

/** A small stateful UsersController (list, details, roles, status, /me) in the browser. */
async function fakeUsers(page: Page, me: FakeUser) {
  // Widen the nullable fields (the fake response has them as literal null).
  const self = {
    ...fakeAuthResponse(me).user,
    jobTitle: null as string | null,
    lastLoginAtUtc: null as string | null,
  };
  const maya = {
    ...self,
    id: '00000000-0000-4000-8000-0000000000a1',
    email: 'maya@example.test',
    firstName: 'Maya',
    lastName: 'Manager',
    roles: ['Manager'],
    lastLoginAtUtc: '2026-11-27T09:00:00Z',
  };
  const store = new Map<string, typeof self>([
    [self.id, self],
    [maya.id, maya],
  ]);
  await fakeApiHandler(page, '/api/users', ({ query }) => {
    const items = [...store.values()].filter(
      (u) => !query.has('IsActive') || String(u.isActive) === query.get('IsActive'),
    );
    return [
      200,
      {
        items,
        page: 1,
        pageSize: 20,
        totalCount: items.length,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    ];
  });
  await fakeApiHandler(page, '/api/users/*', ({ method, path, body }) => {
    const [, , , id, action] = path.split('/');
    const target = id === 'me' ? store.get(self.id) : store.get(id ?? '');
    if (!target) return [404, { status: 404, title: 'Not Found' }];
    if (method === 'PUT' && id === 'me') Object.assign(target, body);
    if (action === 'roles') Object.assign(target, body);
    if (action === 'status') target.isActive = (body as { isActive: boolean }).isActive;
    return [200, target];
  });
  await fakeApiHandler(page, '/api/auth/me', () => [200, store.get(self.id)]);
  return { maya };
}

test.describe('Users, profile and team (faked API)', () => {
  test.beforeEach(async ({ page }) => {
    await fakeEmptyWorkspace(page);
  });

  test('an admin changes roles and deactivates an account', async ({ page }) => {
    test.slow();
    const { maya } = await fakeUsers(page, FAKE_USERS.admin);
    await signInWithFakeApi(page, FAKE_USERS.admin, '/admin/users');

    await expect(page.getByRole('link', { name: 'Maya Manager' })).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await page.getByRole('link', { name: 'Maya Manager' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Maya Manager' })).toBeVisible();
    await expect(page).toHaveTitle('Maya Manager · Task Management System');

    await page.getByRole('checkbox', { name: 'Admin' }).check();
    await page.getByRole('button', { name: 'Save roles' }).click();
    await expect(page.getByText('Roles updated', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Deactivate account' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('signed out on every device');
    await expectNoAccessibilityViolations(page);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByRole('button', { name: 'Reactivate account' })).toBeVisible();
    expect(maya.id).toBeTruthy();

    // My own account: Admin role locked, no Deactivate.
    await page.goto(`/admin/users/${FAKE_USER_ID}`);
    await expect(page.getByRole('checkbox', { name: 'Admin' })).toBeDisabled();
    await expect(page.getByText("You can't deactivate your own account.")).toBeVisible();
    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expectNoAccessibilityViolations(page);
  });

  test('I edit my profile and the header follows', async ({ page }) => {
    await fakeUsers(page, FAKE_USERS.user);
    await signInWithFakeApi(page, FAKE_USERS.user, '/profile');

    await page.getByLabel('Job title').fill('Frontend Developer');
    await page.getByLabel('First name').fill('Umaya');
    await expectNoAccessibilityViolations(page);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile saved', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Account menu for Umaya User' })).toBeVisible();
  });

  test('Team lists the people in my projects', async ({ page }) => {
    await fakeTaskWorld(page, { iOwnTheProject: false });
    await signInWithFakeApi(page, FAKE_USERS.user, '/team');

    const team = page.getByRole('list', { name: 'Team members' });
    await expect(team.getByRole('link')).toHaveText(['Olivia Owner', 'Tara Teammate', 'Uma User']);
    await expectNoAccessibilityViolations(page);
    await team.getByRole('link', { name: 'Tara Teammate' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tara Teammate' })).toBeVisible();
    await expect(page.getByText('Website Redesign').first()).toBeVisible();
  });
});
