import { expect, type Page, test } from '@playwright/test';

import { expectNoAccessibilityViolations } from './support/accessibility';
import { FAKE_USERS, fakeApi, fakeApiHandler, signInWithFakeApi } from './support/fakeApi';

interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

/** A small stateful CategoriesController (unique names, case-insensitive) running in the browser route. */
async function fakeCategories(page: Page, initial: string[]) {
  const store = new Map<number, Category>();
  let nextId = 1;
  for (const name of initial) {
    store.set(nextId, {
      id: nextId,
      name,
      description: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: null,
    });
    nextId++;
  }
  const taken = (name: string, except?: number) =>
    [...store.values()].some((c) => c.id !== except && c.name.toLowerCase() === name.toLowerCase());

  await fakeApiHandler(page, '/api/categories', ({ method, body }) => {
    if (method === 'GET')
      return [200, [...store.values()].sort((a, b) => a.name.localeCompare(b.name))];
    const { name, description } = body as { name: string; description: string | null };
    if (taken(name))
      return [
        409,
        { status: 409, title: 'Conflict', detail: `A category named '${name}' already exists.` },
      ];
    const created = {
      id: nextId++,
      name,
      description,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: null,
    };
    store.set(created.id, created);
    return [201, created];
  });
  await fakeApiHandler(page, '/api/categories/*', ({ method, path, body }) => {
    const id = Number(path.split('/').pop());
    const existing = store.get(id);
    if (!existing) return [404, { status: 404, title: 'Not found' }];
    if (method === 'DELETE') {
      store.delete(id);
      return [204];
    }
    const { name, description } = body as { name: string; description: string | null };
    if (taken(name, id))
      return [409, { status: 409, detail: `A category named '${name}' already exists.` }];
    const updated = { ...existing, name, description, updatedAtUtc: new Date().toISOString() };
    store.set(id, updated);
    return [200, updated];
  });
  await fakeApi(page, '/api/tasks', 200, {
    items: [],
    page: 1,
    pageSize: 1,
    totalCount: 3,
    totalPages: 3,
    hasPreviousPage: false,
    hasNextPage: true,
  });
}

const table = (page: Page) => page.getByRole('table', { name: 'Categories' });

test.describe('Categories (faked API)', () => {
  test('admin creates, renames and deletes a category', async ({ page }) => {
    await fakeCategories(page, ['Bug', 'Feature']);
    await signInWithFakeApi(page, FAKE_USERS.admin, '/categories');
    await expect(table(page).getByText('Bug', { exact: true })).toBeVisible();

    // Create (with a duplicate first: case-insensitive 409 shown on the field)
    await page.getByRole('button', { name: 'New category' }).first().click();
    const create = page.getByRole('dialog', { name: 'New category' });
    await expect(create.getByLabel('Name')).toBeFocused();
    await create.getByLabel('Name').fill('bug');
    await create.getByRole('button', { name: 'Create category' }).click();
    await expect(create.getByText("A category named 'bug' already exists.")).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await create.getByLabel('Name').fill('Research');
    await create.getByLabel('Description').fill('Spikes and investigations');
    await create.getByRole('button', { name: 'Create category' }).click();
    await expect(page.getByText('Category created', { exact: true })).toBeVisible();
    await expect(table(page).getByText('Research', { exact: true })).toBeVisible();

    // Rename
    await page.getByRole('button', { name: 'Actions for Research' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit category' });
    await edit.getByLabel('Name').fill('Investigation');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(table(page).getByText('Investigation', { exact: true })).toBeVisible();

    // Delete (the dialog reports how many tasks use it)
    await page.getByRole('button', { name: 'Actions for Investigation' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete "Investigation"?' });
    await expect(confirm.getByText(/3 tasks use it/)).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await confirm.getByRole('button', { name: 'Delete category' }).click();
    await expect(page.getByText('Category deleted', { exact: true })).toBeVisible();
    await expect(table(page).getByText('Investigation', { exact: true })).toHaveCount(0);
  });

  test('search survives a reload (kept in the URL)', async ({ page }) => {
    await fakeCategories(page, ['Bug', 'Feature', 'Documentation']);
    await signInWithFakeApi(page, FAKE_USERS.user, '/categories');

    await page.getByRole('searchbox', { name: 'Search categories' }).fill('feat');
    await expect(page).toHaveURL(/\/categories\?search=feat$/);
    await page.reload();

    await expect(page.getByRole('searchbox', { name: 'Search categories' })).toHaveValue('feat');
    await expect(table(page).getByRole('row')).toHaveCount(2); // header + Feature
  });

  test('read-only for regular users, accessible in light and dark', async ({ page }) => {
    await fakeCategories(page, ['Bug', 'Feature']);
    await signInWithFakeApi(page, FAKE_USERS.user, '/categories');
    await expect(table(page).getByText('Bug', { exact: true })).toBeVisible();

    await expect(page.getByRole('button', { name: 'New category' })).toHaveCount(0);
    await expect(page.getByText('Categories are managed by administrators.')).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
    await expectNoAccessibilityViolations(page);
  });
});
