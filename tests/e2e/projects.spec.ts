import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import {
  FAKE_USER_ID,
  FAKE_USERS,
  fakeApiHandler,
  fakeEmptyWorkspace,
  signInWithFakeApi,
} from './support/fakeApi';

interface Member {
  userId: string;
  fullName: string;
  email: string;
  memberRole: 'Owner' | 'Member';
  joinedAtUtc: string;
}
interface Project {
  id: number;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  ownerName: string;
  members: Member[];
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

const OTHER_OWNER = '00000000-0000-4000-8000-0000000000aa';
const DIRECTORY = [
  {
    id: '00000000-0000-4000-8000-000000000c01',
    fullName: 'Carla Diaz',
    email: 'carla@example.test',
    jobTitle: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000c02',
    fullName: 'Carl Stone',
    email: 'carl@example.test',
    jobTitle: null,
  },
];

/** A small stateful ProjectsController + users lookup, running in the browser's route handlers. */
async function fakeProjects(
  page: Page,
  initial: { name: string; mine: boolean; done?: number; open?: number }[],
) {
  const store = new Map<number, Project>();
  const progress = new Map<number, { done: number; open: number }>();
  let nextId = 1;
  const owner = (mine: boolean): Member => ({
    userId: mine ? FAKE_USER_ID : OTHER_OWNER,
    fullName: mine ? 'Max Manager' : 'Olivia Owner',
    email: mine ? 'max@example.test' : 'olivia@example.test',
    memberRole: 'Owner',
    joinedAtUtc: '2026-11-01T09:00:00Z',
  });
  for (const { name, mine, done = 0, open = 0 } of initial) {
    const o = owner(mine);
    store.set(nextId, {
      id: nextId,
      name,
      description: `${name} description`,
      startDate: '2026-11-01',
      endDate: '2027-03-31',
      ownerId: o.userId,
      ownerName: o.fullName,
      members: mine ? [o] : [o, owner(true)],
      createdAtUtc: `2026-11-${String(10 + nextId).padStart(2, '0')}T09:00:00Z`,
      updatedAtUtc: null,
    });
    progress.set(nextId, { done, open });
    nextId++;
  }
  const summary = (p: Project) => {
    const { done, open } = progress.get(p.id) ?? { done: 0, open: 0 };
    return {
      ...p,
      members: undefined,
      memberCount: p.members.length,
      taskCount: done + open,
      doneTaskCount: done,
      openTaskCount: open,
      completionPercent: done + open === 0 ? 0 : Math.round((1000 * done) / (done + open)) / 10,
    };
  };

  await fakeApiHandler(page, '/api/projects', ({ method, body }) => {
    if (method === 'GET') {
      const items = [...store.values()]
        .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))
        .map(summary);
      return [
        200,
        {
          items,
          page: 1,
          pageSize: 12,
          totalCount: items.length,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      ];
    }
    const request = body as Pick<Project, 'name' | 'description' | 'startDate' | 'endDate'>;
    const o = owner(true);
    const created: Project = {
      id: nextId++,
      ...request,
      ownerId: o.userId,
      ownerName: o.fullName,
      members: [o],
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: null,
    };
    store.set(created.id, created);
    return [201, created];
  });

  await fakeApiHandler(page, '/api/projects/*', ({ method, path, body }) => {
    const [, , , rawId, section, memberId] = path.split('/');
    const project = store.get(Number(rawId));
    if (!project) return [404, { status: 404, title: 'Not Found' }];
    if (section === 'members') {
      if (method === 'POST') {
        const user = DIRECTORY.find((u) => u.id === (body as { userId: string }).userId);
        if (!user) return [422, { status: 422, detail: 'The user does not exist or is inactive.' }];
        project.members.push({
          userId: user.id,
          fullName: user.fullName,
          email: user.email,
          memberRole: 'Member',
          joinedAtUtc: new Date().toISOString(),
        });
        return [200, project];
      }
      project.members = project.members.filter((m) => m.userId !== memberId);
      return [204];
    }
    if (method === 'DELETE') {
      store.delete(project.id);
      return [204];
    }
    if (method === 'PUT') Object.assign(project, body);
    return [200, project];
  });

  await fakeApiHandler(page, '/api/users/lookup', () => [200, DIRECTORY]);
}

test.describe('Projects (faked API)', () => {
  test.beforeEach(async ({ page }) => {
    await fakeEmptyWorkspace(page);
  });

  test('a manager creates a project, adds a member, and deletes it', async ({ page }) => {
    test.slow(); // a long flow with three full accessibility scans
    await fakeProjects(page, [{ name: 'Website Redesign', mine: true, done: 3, open: 1 }]);
    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects');

    const card = page.getByRole('article', { name: 'Website Redesign' });
    await expect(
      card.getByRole('progressbar', { name: 'Website Redesign progress' }),
    ).toHaveAttribute('aria-valuenow', '75');
    await expectNoAccessibilityViolations(page);

    // Create → lands on the new project
    await page.getByRole('button', { name: 'New project' }).click();
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await dialog.getByLabel('Name').fill('Launch');
    await dialog.getByLabel('Start date').fill('2026-12-10');
    await dialog.getByLabel('End date').fill('2026-12-01');
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await expect(dialog.getByText('End date must be on or after the start date.')).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await dialog.getByLabel('End date').fill('2026-12-31');
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Launch' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Breadcrumb' }).getByText('Launch'),
    ).toBeVisible();
    await expect(page).toHaveTitle('Launch · Task Management System');

    // Members: search, pick with the keyboard
    await page.getByRole('link', { name: 'Members (1)' }).click();
    const picker = page.getByRole('combobox', { name: 'Add a member' });
    await picker.fill('car');
    await expect(page.getByRole('listbox', { name: 'Matching users' })).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await picker.press('ArrowDown');
    await picker.press('Enter');
    await expect(page.getByText('Member added', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Members of Launch' }).getByText('Carl Stone'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Members (2)' })).toBeVisible();

    // Delete → back to the list
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete "Launch"?' });
    await expect(confirm.getByText(/It has no tasks\./)).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete project' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Launch' })).toHaveCount(0);
  });

  test('table view and overview are accessible in light and dark mode', async ({ page }) => {
    await fakeProjects(page, [
      { name: 'Website Redesign', mine: true, done: 2, open: 2 },
      { name: 'Mobile App', mine: false },
    ]);
    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects?view=table');

    const table = page.getByRole('table', { name: 'Projects' });
    await expect(table.getByRole('link', { name: 'Mobile App' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actions for Mobile App' })).toHaveCount(0); // not mine
    await expectNoAccessibilityViolations(page);

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expectNoAccessibilityViolations(page);

    await table.getByRole('link', { name: 'Website Redesign' }).click();
    await expect(page.getByRole('table', { name: 'Tasks by status' })).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test('a regular user sees projects read-only', async ({ page }) => {
    await fakeProjects(page, [{ name: 'Mobile App', mine: false }]);
    await signInWithFakeApi(page, FAKE_USERS.user, '/projects');

    await expect(page.getByRole('link', { name: 'Mobile App' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New project' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Mobile App' }).click();
    await page.getByRole('link', { name: /^Members/ }).click();
    await expect(page.getByRole('table', { name: 'Members of Mobile App' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Add a member' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
  });
});
