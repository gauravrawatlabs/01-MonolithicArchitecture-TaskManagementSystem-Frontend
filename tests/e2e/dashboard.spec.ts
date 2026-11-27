import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { FAKE_USERS, fakeApi, signInWithFakeApi } from './support/fakeApi';

const day = 86_400_000;

const dashboard = {
  generatedAtUtc: new Date().toISOString(),
  scope: 'MyProjects',
  projectCount: 3,
  tasks: { total: 42, open: 25, overdue: 4, dueInNext7Days: 9, completedInLast7Days: 6 },
  myWork: { assignedOpen: 7, assignedOverdue: 2, assignedDueInNext7Days: 3 },
  tasksByStatus: { Todo: 12, InProgress: 8, InReview: 5, Done: 15, Cancelled: 2 },
  tasksByPriority: { Low: 6, Medium: 20, High: 11, Critical: 5 },
  projects: [
    {
      projectId: 1,
      name: 'Website Redesign',
      totalTasks: 20,
      openTasks: 12,
      doneTasks: 8,
      overdueTasks: 3,
      completionPercent: 40,
    },
    {
      projectId: 2,
      name: 'Mobile App',
      totalTasks: 15,
      openTasks: 9,
      doneTasks: 5,
      overdueTasks: 1,
      completionPercent: 35.7,
    },
  ],
};

const task = (id: number, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  description: null,
  status: 'Todo',
  priority: 'High',
  dueDateUtc: new Date(Date.now() + day).toISOString(),
  completedAtUtc: null,
  isOverdue: false,
  projectId: 1,
  projectName: 'Website Redesign',
  categoryId: null,
  categoryName: null,
  createdById: 'x',
  createdByName: 'Max Manager',
  assignedToId: null,
  assignedToName: null,
  createdAtUtc: new Date(Date.now() - 3 * day).toISOString(),
  updatedAtUtc: new Date().toISOString(),
  ...extra,
});

async function openDashboard(page: Page, data: unknown = dashboard) {
  await fakeApi(page, '/api/dashboard', 200, data);
  await fakeApi(page, '/api/tasks', 200, {
    items: [
      task(101, 'Write API docs'),
      task(102, 'Fix login bug', { isOverdue: true, priority: 'Critical' }),
    ],
    page: 1,
    pageSize: 20,
    totalCount: 2,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  await signInWithFakeApi(page, FAKE_USERS.manager, '/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

test.describe('Dashboard (faked API)', () => {
  test('renders the figures, one bar per status, and the table view', async ({ page }) => {
    await openDashboard(page);

    const figures = page.getByRole('region', { name: 'Key figures' });
    await expect(figures.getByRole('link', { name: /Total tasks\s*42/ })).toBeVisible();

    const statusCard = page.locator('section', {
      has: page.getByRole('heading', { name: 'Tasks by status' }),
    });
    await expect(statusCard.locator('.recharts-bar-rectangle')).toHaveCount(5);
    await expect(statusCard.locator('.recharts-label-list')).toContainText('15');

    await statusCard.getByRole('button', { name: 'Table' }).click();
    await expect(statusCard.getByRole('rowheader', { name: 'In review' })).toBeVisible();
  });

  test('shows a tooltip when hovering a bar', async ({ page }) => {
    await openDashboard(page);
    const priorityCard = page.locator('section', {
      has: page.getByRole('heading', { name: 'Tasks by priority' }),
    });

    await priorityCard.locator('.recharts-bar-rectangle').nth(2).hover(); // Medium
    await expect(priorityCard.getByText('tasks · Medium')).toBeVisible();
  });

  test('fits the phone screen without horizontal scrolling', async ({ page }) => {
    await openDashboard(page);
    await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no accessibility violations (light and dark)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openDashboard(page);
    await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expectNoAccessibilityViolations(page);
  });

  test('empty workspace: explains what to do next', async ({ page }) => {
    await openDashboard(page, { ...dashboard, projectCount: 0, projects: [] });

    await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
});
