import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/** Runs axe (WCAG 2.x A/AA rules, including colour contrast) and fails with readable details. */
async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact ?? 'n/a'}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ') ?? ''}`,
  );
  expect(summary).toEqual([]);
}

test.describe('Design system', () => {
  test('has no accessibility violations in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Component library' })).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test('has no accessibility violations in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await expectNoAccessibilityViolations(page);
  });

  test('applies a saved dark theme before the app script runs (no white flash)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tms.theme', 'dark');
    });
    // Block the app bundle: only index.html and its inline theme script run.
    await page.route('**/src/main.tsx', (route) => route.abort());

    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('remembers the chosen theme across reloads', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(
      page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('modal works with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    const openButton = page.getByRole('button', { name: 'Open modal' });

    await openButton.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'New project' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: /Name/ })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();
  });
});
