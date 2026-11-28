import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { FAKE_USERS, fakeEmptyWorkspace, signInWithFakeApi } from './support/fakeApi';
import { fakeTaskWorld } from './support/fakeTasks';

const column = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const card = (page: Page, columnName: string, title: string) =>
  column(page, columnName).getByRole('article', { name: title });

test.describe('Board (faked API)', () => {
  test.beforeEach(async ({ page }) => {
    await fakeEmptyWorkspace(page);
    await fakeTaskWorld(page, { iOwnTheProject: true });
  });

  test('drag with the pointer and with the keyboard; forbidden columns say so', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'desktop',
      'Pointer dragging across columns needs the desktop layout',
    );
    test.slow();
    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects/7/board');
    await expect(card(page, 'To do', 'Write homepage copy')).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // Pointer: pick up, hover over Done (not allowed from To do), drop on In progress.
    const handle = page.getByRole('button', { name: 'Drag Write homepage copy' });
    const box = await handle.boundingBox();
    const target = await column(page, 'In progress').boundingBox();
    if (!box || !target) throw new Error('layout not ready');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + 20, { steps: 5 });
    await expect(column(page, 'Done').getByText('Not allowed')).toBeVisible();
    await expect(column(page, 'In progress').getByText('Not allowed')).toHaveCount(0);
    await page.mouse.move(target.x + target.width / 2, target.y + 80, { steps: 10 });
    await page.mouse.up();
    await expect(card(page, 'In progress', 'Write homepage copy')).toBeVisible();
    await expect(card(page, 'To do', 'Write homepage copy')).toHaveCount(0);

    // Keyboard: Space picks up, → jumps one column, Space drops. Like a screen-reader user, wait for each
    // announcement before the next key (dnd-kit updates the target column on the next render, so a drop
    // in the same instant as the arrow would land on the old column).
    await page.getByRole('button', { name: 'Drag Write homepage copy' }).focus();
    await page.keyboard.press('Space');
    await expect(
      page.getByText(
        /^Picked up Write homepage copy from In progress\. It can move to: To do, In review, Cancelled\.$/,
      ),
    ).toBeAttached();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Over In review.', { exact: true })).toBeAttached();
    await page.keyboard.press('Space');
    await expect(card(page, 'In review', 'Write homepage copy')).toBeVisible();
    await expect(page.getByText('Write homepage copy moved to In review.')).toBeAttached();
    // Focus follows the card into its new column (it isn't dropped back to the top of the page).
    await expect(
      card(page, 'In review', 'Write homepage copy').getByRole('button', {
        name: 'Drag Write homepage copy',
      }),
    ).toBeFocused();

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expectNoAccessibilityViolations(page);
  });

  test('"Move to…" works everywhere without dragging (touch, keyboard, phones)', async ({
    page,
  }) => {
    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects/7/board');
    await page.getByRole('button', { name: 'Move Fix login bug to…' }).click();
    await page.getByRole('menuitem', { name: 'Done' }).click();
    await expect(card(page, 'Done', 'Fix login bug')).toBeAttached();
    await expect(card(page, 'In review', 'Fix login bug')).toHaveCount(0);
    // The owner may still reopen it, so focus lands on its handle in the Done column.
    await expect(
      card(page, 'Done', 'Fix login bug').getByRole('button', { name: 'Drag Fix login bug' }),
    ).toBeFocused();
  });

  test('the page never scrolls sideways: only the board does', async ({ page }) => {
    await signInWithFakeApi(page, FAKE_USERS.manager, '/projects/7/board?cancelled=true');
    await expect(card(page, 'To do', 'Write homepage copy')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('discuss a task: add, edit and delete a comment', async ({ page }) => {
    await signInWithFakeApi(page, FAKE_USERS.manager, '/tasks/1');
    await expect(page.getByRole('heading', { name: 'Comments (1)' })).toBeVisible();

    await page.getByLabel('Add a comment').fill('Hero copy is ready for review.');
    await page.getByLabel('Add a comment').press('Control+Enter');
    await expect(page.getByRole('heading', { name: 'Comments (2)' })).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.getByRole('button', { name: 'Edit comment by Max Manager' }).click();
    await page.getByLabel('Edit comment').fill('Hero copy is ready, please review.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Hero copy is ready, please review.')).toBeVisible();
    await expect(page.getByText(/edited/)).toBeVisible();

    await page.getByRole('button', { name: 'Delete comment by Max Manager' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete comment' }).click();
    await expect(page.getByText('Hero copy is ready, please review.')).toHaveCount(0);
    await expect(page.getByText('I can take the hero section.')).toBeVisible();
  });
});
