import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, problem } from '../mocks/api';
import { buildCategory, serveCategories } from '../mocks/fakeCategoriesApi';
import { buildPagedTasks, buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { server } from '../mocks/server';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const admin = buildUser({ firstName: 'Ada', roles: ['Admin'] });
const unverifiedAdmin = buildUser({ roles: ['Admin'], emailConfirmed: false });
const member = buildUser({ roles: ['User'] });

const bug = buildCategory({
  name: 'Bug',
  description: 'Something is broken',
  createdAtUtc: '2026-11-01T09:00:00Z',
});
const feature = buildCategory({
  name: 'Feature',
  description: 'New capability',
  createdAtUtc: '2026-11-20T09:00:00Z',
});
const docs = buildCategory({
  name: 'Documentation',
  description: null,
  createdAtUtc: '2026-11-10T09:00:00Z',
});

const dataRows = () =>
  within(screen.getByRole('table', { name: 'Categories' }))
    .getAllByRole('row')
    .slice(1);
const rowNames = () =>
  dataRows().map((row) => within(row).getAllByRole('cell')[0]?.querySelector('p')?.textContent);

async function openPage(user = admin, path = '/categories') {
  const result = renderRoute(path, { user });
  await screen.findByRole('cell', { name: /Bug/ });
  return result;
}

describe('Categories: reading', () => {
  it('lists categories in name order with a count', async () => {
    serveCategories([feature, bug, docs]);
    await openPage();

    expect(rowNames()).toEqual(['Bug', 'Documentation', 'Feature']);
    expect(screen.getByText('3 categories')).toBeInTheDocument();
  });

  it('is read-only for non-admins: no create button, no actions, and a short explanation', async () => {
    serveCategories([bug]);
    await openPage(member);

    expect(screen.queryByRole('button', { name: 'New category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument();
    expect(screen.getByText('Categories are managed by administrators.')).toBeInTheDocument();
  });

  it('shows an unverified admin WHY they cannot manage categories (visible text, not a tooltip)', async () => {
    serveCategories([bug]);
    await openPage(unverifiedAdmin);

    expect(screen.getByRole('button', { name: 'New category' })).toBeDisabled();
    expect(screen.getByText('Verify your email address to manage categories.')).toBeInTheDocument();
  });

  it('searches name and description, keeps the search in the URL, and offers to clear it', async () => {
    serveCategories([bug, feature, docs]);
    const { user, router } = await openPage();

    await user.type(screen.getByRole('searchbox', { name: 'Search categories' }), 'capab');
    expect(rowNames()).toEqual(['Feature']); // matched on the description
    expect(screen.getByText('1 of 3 categories match')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/categories?search=capab');

    await user.clear(screen.getByRole('searchbox', { name: 'Search categories' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search categories' }), 'zzz');
    expect(screen.getByText('No categories match "zzz"')).toBeInTheDocument();
    // The empty state offers its own "Clear search" (the search box has one too).
    const table = screen.getByRole('table', { name: 'Categories' });
    await user.click(within(table).getByRole('button', { name: 'Clear search' }));

    expect(rowNames()).toHaveLength(3);
    expect(currentUrl(router)).toBe('/categories');
  });

  it('restores search and sort from a shared link', async () => {
    serveCategories([bug, feature, docs]);
    renderRoute('/categories?search=o&sort=CreatedAt&dir=Desc', { user: admin });
    await screen.findByRole('cell', { name: /Documentation/ });

    expect(screen.getByRole('searchbox', { name: 'Search categories' })).toHaveValue('o');
    // "o" matches "Documentation" and Bug's description "Something is broken"; newest first.
    expect(rowNames()).toEqual(['Documentation', 'Bug']);
    expect(screen.getByRole('columnheader', { name: 'Created' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('sorts by creation date from the column header', async () => {
    serveCategories([bug, feature, docs]);
    const { user, router } = await openPage();

    await user.click(screen.getByRole('button', { name: 'Created' }));
    expect(rowNames()).toEqual(['Bug', 'Documentation', 'Feature']);
    await user.click(screen.getByRole('button', { name: 'Created' }));

    expect(rowNames()).toEqual(['Feature', 'Documentation', 'Bug']);
    expect(currentUrl(router)).toBe('/categories?sort=CreatedAt&dir=Desc');
  });

  it('invites an admin to create the first category when there are none', async () => {
    serveCategories([]);
    renderRoute('/categories', { user: admin });

    expect(await screen.findByRole('heading', { name: 'No categories yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New category' })).toHaveLength(2); // header + empty state
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    let fail = true;
    server.use(
      http.get(apiUrl('/api/categories'), () => (fail ? problem(500) : HttpResponse.json([bug]))),
    );
    const { user } = renderRoute('/categories', { user: admin });

    expect(await screen.findByText("We couldn't load the categories")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('cell', { name: /Bug/ })).toBeInTheDocument();
  });
});

describe('Categories: writing (admin)', () => {
  it('creates a category: focus on name, client validation, trimmed body, toast, new row', async () => {
    const { requests } = serveCategories([bug]);
    const { user } = await openPage();

    await user.click(screen.getByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    const name = within(dialog).getByLabelText('Name');
    expect(name).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Create category' }));
    expect(await within(dialog).findByText('Name is required.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await user.type(name, '  Research  ');
    await user.click(within(dialog).getByRole('button', { name: 'Create category' }));

    expect(await screen.findByText('Category created')).toBeInTheDocument();
    expect(requests[0]?.body).toEqual({ name: 'Research', description: null });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(rowNames()).toEqual(['Bug', 'Research']);
  });

  it('shows "already exists" (409, case-insensitive) under the name and keeps the dialog open', async () => {
    serveCategories([bug]);
    const { user } = await openPage();

    await user.click(screen.getByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    await user.type(within(dialog).getByLabelText('Name'), 'BUG');
    await user.click(within(dialog).getByRole('button', { name: 'Create category' }));

    expect(
      await within(dialog).findByText("A category named 'BUG' already exists."),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits a category with its current values filled in', async () => {
    const { requests } = serveCategories([bug, feature]);
    const { user } = await openPage();

    await user.click(screen.getByRole('button', { name: 'Actions for Bug' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit category' });
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Bug');
    expect(within(dialog).getByLabelText('Description')).toHaveValue('Something is broken');
    expect(within(dialog).getByText('19 / 500')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Name'));
    await user.type(within(dialog).getByLabelText('Name'), 'Defect');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Category updated')).toBeInTheDocument();
    expect(requests[0]).toEqual({
      method: 'PUT',
      path: `/api/categories/${bug.id}`,
      body: { name: 'Defect', description: 'Something is broken' },
    });
    await waitFor(() => {
      expect(rowNames()).toEqual(['Defect', 'Feature']);
    });
  });

  it('deletes after a confirmation that says how many tasks use the category', async () => {
    const { requests } = serveCategories([bug, feature]);
    server.use(
      http.get(apiUrl('/api/tasks'), ({ request }) =>
        new URL(request.url).searchParams.get('CategoryId') === String(bug.id)
          ? HttpResponse.json(buildPagedTasks([buildTask()], 1, 1, 5))
          : HttpResponse.json(buildPagedTasks([])),
      ),
    );
    const { user } = await openPage();

    await user.click(screen.getByRole('button', { name: 'Actions for Bug' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete "Bug"?' });
    expect(
      await within(dialog).findByText(
        /5 tasks use it; they keep existing without a category\. This can't be undone\./,
      ),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete category' }));

    expect(await screen.findByText('Category deleted')).toBeInTheDocument();
    expect(requests).toEqual([
      { method: 'DELETE', path: `/api/categories/${bug.id}`, body: undefined },
    ]);
    await waitFor(() => {
      expect(rowNames()).toEqual(['Feature']);
    });
  });

  it('keeps the confirmation open and explains when deleting fails', async () => {
    serveCategories([bug]);
    server.use(
      http.delete(apiUrl('/api/categories/:id'), () =>
        problem(404, { detail: "Category with id '1' was not found." }),
      ),
    );
    const { user } = await openPage();

    await user.click(screen.getByRole('button', { name: 'Actions for Bug' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete category' }));

    expect(await screen.findByText('Could not delete the category')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('shows the server message when the API refuses (403), e.g. the role was removed meanwhile', async () => {
    serveCategories([bug]);
    server.use(
      http.post(apiUrl('/api/categories'), () =>
        problem(403, { title: 'Forbidden', detail: 'You are not allowed to do this.' }),
      ),
    );
    const { user } = await openPage();

    await user.click(screen.getByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    await user.type(within(dialog).getByLabelText('Name'), 'Research');
    await user.click(within(dialog).getByRole('button', { name: 'Create category' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'You are not allowed to do this.',
    );
  });
});
