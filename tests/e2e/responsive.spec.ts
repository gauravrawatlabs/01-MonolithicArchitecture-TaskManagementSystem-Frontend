import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { FAKE_USER_ID, FAKE_USERS, fakeEmptyWorkspace, signInWithFakeApi } from './support/fakeApi';
import { fakeTaskWorld } from './support/fakeTasks';
import { fakeUsers } from './support/fakeUsers';

/**
 * Responsiveness sweep (Phase 14): every page of the app, on each project's viewport (phone, tablet,
 * desktop), must
 *   • never scroll sideways (only inner scrollers such as the board may), and
 *   • pass axe, which includes WCAG 2.2 "target size (minimum)": touch targets of at least 24 × 24 px.
 * The data is a small faked workspace in which an Admin owns one project with two tasks.
 */
const PAGES: readonly [string, string][] = [
  ['/dashboard', 'Dashboard'],
  ['/tasks', 'All tasks'],
  ['/tasks?assignedToMe=true', 'My tasks'],
  ['/tasks/1', 'Write homepage copy'],
  ['/board', 'Board'],
  ['/projects', 'Projects'],
  ['/projects?view=table', 'Projects'],
  ['/projects/7', 'Website Redesign'],
  ['/projects/7/tasks', 'Website Redesign'],
  ['/projects/7/board', 'Website Redesign'],
  ['/projects/7/members', 'Website Redesign'],
  ['/categories', 'Categories'],
  ['/team', 'Team'],
  ['/team/00000000-0000-4000-8000-0000000000bb', 'Tara Teammate'],
  ['/profile', 'Profile'],
  ['/settings/account', 'Settings · Account'],
  ['/settings/security', 'Settings · Security'],
  ['/settings/appearance', 'Settings · Appearance'],
  ['/settings/preferences', 'Settings · Preferences'],
  ['/admin', 'Admin'],
  ['/admin/users', 'Users'],
  [`/admin/users/${FAKE_USER_ID}`, 'Ada Admin'],
];

test('every page fits the screen and passes accessibility checks', async ({ page }) => {
  test.setTimeout(240_000); // 22 pages, each with a full axe scan
  await fakeEmptyWorkspace(page);
  await fakeTaskWorld(page, { iOwnTheProject: true });
  await fakeUsers(page, FAKE_USERS.admin);
  await signInWithFakeApi(page, FAKE_USERS.admin, '/dashboard');

  const problems: string[] = [];
  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 0) problems.push(`${path}: page scrolls sideways by ${String(overflow)} px`);
    try {
      await expectNoAccessibilityViolations(page);
    } catch (error) {
      problems.push(
        `${path}: ${
          error instanceof Error
            ? error.message
                .split('\n')
                .filter((l) => l.includes('('))
                .join(' | ')
            : 'axe failed'
        }`,
      );
    }
  }
  expect(problems).toEqual([]);
});
