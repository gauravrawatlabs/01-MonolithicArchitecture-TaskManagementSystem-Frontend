import { expect, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { FAKE_USERS, fakeEmptyWorkspace, signInWithFakeApi } from './support/fakeApi';
import { fakeTaskWorld, TEAMMATE } from './support/fakeTasks';

test.describe('Tasks (faked API)', () => {
  test.beforeEach(async ({ page }) => {
    await fakeEmptyWorkspace(page);
  });

  test('the project owner creates and assigns a task, then walks it through the workflow', async ({
    page,
  }) => {
    test.slow(); // a long flow with several accessibility scans
    await fakeTaskWorld(page, { iOwnTheProject: true });
    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects/7/tasks');

    await expect(page.getByRole('link', { name: 'Fix login bug' })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.getByRole('button', { name: 'New task' }).click();
    const dialog = page.getByRole('dialog', { name: 'New task' });
    await expect(dialog.getByLabel('Project')).toHaveValue('7');
    await dialog.getByLabel('Title').fill('Plan launch');
    await dialog.getByLabel('Assignee').selectOption({ label: 'Tara Teammate' });
    await expectNoAccessibilityViolations(page);
    await dialog.getByRole('button', { name: 'Create task' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Plan launch' })).toBeVisible();
    await expect(page.getByLabel('Assignee')).toHaveValue(TEAMMATE);
    await expect(page).toHaveTitle('Plan launch · Task Management System');

    const moves = page.getByRole('group', { name: 'Change status' });
    await moves.getByRole('button', { name: 'Start' }).click();
    await moves.getByRole('button', { name: 'Send to review' }).click();
    await moves.getByRole('button', { name: 'Mark done' }).click();
    await expect(moves.getByRole('button', { name: 'Reopen' })).toBeVisible(); // owner may reopen
    await expect(page.getByText(/^Completed /)).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expectNoAccessibilityViolations(page);
  });

  test('an assignee works from "My tasks": status moves only, no editing', async ({ page }) => {
    await fakeTaskWorld(page, { iOwnTheProject: false });
    await signInWithFakeApi(page, FAKE_USERS.user, '/tasks?assignedToMe=true');

    await expect(page.getByRole('heading', { level: 1, name: 'My tasks' })).toBeVisible();
    await page.getByRole('button', { name: 'Actions for Write homepage copy' }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText(['Start', 'Cancel task']);
    await menu.getByRole('menuitem', { name: 'Start' }).click();
    await expect(page.getByText('Moved to In progress', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Write homepage copy' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Write homepage copy' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Change status' }).getByRole('button')).toHaveText(
      ['Back to to do', 'Send to review', 'Cancel task'],
    );
    await expectNoAccessibilityViolations(page);
  });

  test('filters are kept in the URL and survive a reload', async ({ page }) => {
    await fakeTaskWorld(page, { iOwnTheProject: true });
    await signInWithFakeApi(page, FAKE_USERS.manager, '/tasks');
    // On phones the filters are folded behind a "Filters" button.
    const openFilters = async () => {
      // Wait for the list first: isVisible() doesn't wait, and the page may still be loading.
      await expect(page.getByRole('table', { name: 'Tasks' })).toBeVisible();
      const toggle = page.getByRole('button', { name: /^Filters/ });
      if (await toggle.isVisible()) await toggle.click();
    };
    await openFilters();

    await page.getByRole('combobox', { name: 'Status' }).selectOption('InReview');
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('Critical');
    await expect(page).toHaveURL(/\/tasks\?status=InReview&priority=Critical$/);
    await page.reload();
    await expect(page.getByRole('table', { name: 'Tasks' })).toBeVisible();
    if (await page.getByRole('button', { name: /^Filters/ }).isVisible()) {
      await expect(page.getByRole('button', { name: 'Filters (2)' })).toBeVisible(); // count survives too
    }
    await openFilters();
    await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('InReview');
    await expect(page.getByRole('combobox', { name: 'Priority' })).toHaveValue('Critical');
  });
});
