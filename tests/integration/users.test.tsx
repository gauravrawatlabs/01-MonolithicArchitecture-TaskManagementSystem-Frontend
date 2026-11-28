import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildUser } from '../mocks/factories/users';
import { serveUsers } from '../mocks/fakeUsersApi';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const admin = buildUser({
  firstName: 'Ada',
  lastName: 'Admin',
  email: 'ada@example.test',
  roles: ['Admin'],
});
const maya = buildUser({
  firstName: 'Maya',
  lastName: 'Manager',
  email: 'maya@example.test',
  roles: ['Manager'],
  lastLoginAtUtc: '2026-11-27T09:00:00Z',
});
const rui = buildUser({
  firstName: 'Rui',
  lastName: 'Regular',
  email: 'rui@example.test',
  roles: ['User'],
  isActive: false,
});

const rows = () =>
  within(screen.getByRole('table', { name: 'Users' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('link')[0]?.textContent);

describe('Profile', () => {
  it('saves my name and job title (trimmed, empty → null) and updates the app header', async () => {
    const me = buildUser({ firstName: 'Jane', lastName: 'Doe', jobTitle: 'Designer' });
    const { requests } = serveUsers([], { currentUser: me });
    const { user } = renderRoute('/profile', { user: me });

    const first = await screen.findByLabelText(/^First name/);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled(); // nothing changed yet
    await user.clear(first);
    await user.type(first, '  Janet ');
    await user.clear(screen.getByLabelText(/^Job title/));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    expect(requests[0]?.body).toEqual({ firstName: 'Janet', lastName: 'Doe', jobTitle: null });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Account menu for Janet Doe' }),
      ).toBeInTheDocument();
    });
  });

  it('validates before saving', async () => {
    const me = buildUser();
    const { requests } = serveUsers([], { currentUser: me });
    const { user } = renderRoute('/profile', { user: me });

    await user.clear(await screen.findByLabelText(/^Last name/));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Last name is required.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('asks unverified users to verify first (the API requires it)', async () => {
    const me = buildUser({ emailConfirmed: false });
    serveUsers([], { currentUser: me });
    renderRoute('/profile', { user: me });

    expect(
      await screen.findByText('Verify your email address to change your profile.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^First name/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.getByText('Not verified yet')).toBeInTheDocument();
  });
});

describe('Admin › Users', () => {
  it('lists every account sorted by email (API default), with roles and status', async () => {
    const { listQueries } = serveUsers([maya, rui], { currentUser: admin });
    renderRoute('/admin/users', { user: admin });

    await screen.findByRole('link', { name: 'Maya Manager' });
    expect(rows()).toEqual(['Ada Admin', 'Maya Manager', 'Rui Regular']);
    expect(Object.fromEntries(listQueries[0] ?? [])).toEqual({
      SortBy: 'Email',
      SortDirection: 'Asc',
      Page: '1',
      PageSize: '20',
    });
    const ruiRow = screen.getByRole('row', { name: /Rui Regular/ });
    // Once in the Status column (md and up) and once under the email (phones, where that column is hidden).
    expect(within(ruiRow).getAllByText('Deactivated')).toHaveLength(2);
  });

  it('filters by role and status on the server, kept in the URL; last sign-in sorts newest first', async () => {
    const { listQueries } = serveUsers([maya, rui], { currentUser: admin });
    const { user, router } = renderRoute('/admin/users', { user: admin });
    await screen.findByRole('link', { name: 'Maya Manager' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'inactive');
    await waitFor(() => {
      expect(rows()).toEqual(['Rui Regular']);
    });
    expect(listQueries.at(-1)?.get('IsActive')).toBe('false');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'Manager');
    await waitFor(() => {
      expect(rows()).toEqual(['Maya Manager']);
    });
    expect(currentUrl(router)).toBe('/admin/users?role=Manager');

    await user.click(screen.getByRole('button', { name: 'Last sign-in' }));
    await waitFor(() => {
      expect(listQueries.at(-1)?.get('SortDirection')).toBe('Desc');
    });
  });

  it('explains to an unverified admin that verification is needed, without calling the API', async () => {
    const unverified = { ...admin, emailConfirmed: false };
    const { listQueries } = serveUsers([maya], { currentUser: unverified });
    renderRoute('/admin/users', { user: unverified });

    expect(
      await screen.findByRole('heading', { name: 'Verify your email address first' }),
    ).toBeInTheDocument();
    expect(listQueries).toHaveLength(0);
  });

  it('shows account counts on the Admin overview', async () => {
    serveUsers([maya, rui], { currentUser: admin });
    renderRoute('/admin', { user: admin });

    // Each figure is its own small request: wait for each one (they may arrive in any order).
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Deactivated/ })).toHaveTextContent('1');
    });
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /All users/ })).toHaveTextContent('3');
    });
  });
});

describe('Admin › User details', () => {
  it("changes another account's roles (at least one required)", async () => {
    const { requests } = serveUsers([maya], { currentUser: admin });
    const { user } = renderRoute(`/admin/users/${maya.id}`, { user: admin });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Maya Manager' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Manager' }));
    await user.click(screen.getByRole('button', { name: 'Save roles' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one role.');
    expect(requests).toHaveLength(0);

    await user.click(screen.getByRole('checkbox', { name: 'User' }));
    await user.click(screen.getByRole('checkbox', { name: 'Admin' }));
    await user.click(screen.getByRole('button', { name: 'Save roles' }));
    expect(await screen.findByText('Roles updated')).toBeInTheDocument();
    expect(requests[0]?.body).toEqual({ roles: ['Admin', 'User'] });
  });

  it('locks my own Admin role and hides "Deactivate" on my account, saying why', async () => {
    serveUsers([], { currentUser: admin });
    renderRoute(`/admin/users/${admin.id}`, { user: admin });

    expect(await screen.findByRole('checkbox', { name: 'Admin' })).toBeDisabled();
    expect(
      screen.getByText("You can't remove the Admin role from your own account."),
    ).toBeInTheDocument();
    expect(screen.getByText("You can't deactivate your own account.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate account' })).not.toBeInTheDocument();
  });

  it('deactivates after a confirmation that says they are signed out everywhere', async () => {
    const { requests } = serveUsers([maya], { currentUser: admin });
    const { user } = renderRoute(`/admin/users/${maya.id}`, { user: admin });

    await user.click(await screen.findByRole('button', { name: 'Deactivate account' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Deactivate Maya Manager?' });
    expect(within(dialog).getByText(/signed out on every device/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Account deactivated')).toBeInTheDocument();
    expect(requests).toEqual([
      { method: 'PATCH', path: `/api/users/${maya.id}/status`, body: { isActive: false } },
    ]);
    expect(await screen.findByRole('button', { name: 'Reactivate account' })).toBeInTheDocument();
  });

  it('says "User not found" for an unknown id', async () => {
    serveUsers([], { currentUser: admin });
    renderRoute('/admin/users/00000000-0000-4000-9000-00000000dead', { user: admin });
    expect(await screen.findByRole('heading', { name: 'User not found' })).toBeInTheDocument();
  });
});
