import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { DEVICE_PREFERENCES_KEY } from '@/services/devicePreferences';

import { captureRequests } from '../mocks/capture';
import { buildUser } from '../mocks/factories/users';
import { serveTasks } from '../mocks/fakeTasksApi';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const verified = buildUser({ firstName: 'Vera', lastName: 'Verified', roles: ['Manager'] });
const unverified = buildUser({ firstName: 'Una', lastName: 'Unverified', emailConfirmed: false });

describe('Settings › Account', () => {
  it('shows a verified address, roles, and where to change the name', async () => {
    renderRoute('/settings/account', { user: verified });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings · Account' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('Manager')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit in Profile' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.queryByRole('button', { name: /Resend/ })).not.toBeInTheDocument();
  });

  it('resends the confirmation email to my address, then waits 60 s', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/resend-confirmation',
      () => new HttpResponse(null, { status: 204 }),
    );
    const { user } = renderRoute('/settings/account', { user: unverified });

    await user.click(await screen.findByRole('button', { name: 'Resend confirmation email' }));

    expect(await screen.findByText('Confirmation email sent')).toBeInTheDocument();
    expect(calls.map((c) => c.body)).toEqual([{ email: unverified.email }]);
    expect(screen.getByRole('button', { name: /Resend available in 60 s/ })).toBeDisabled();
  });

  it('the verify-email banner links to Settings › Account (not shown on that page itself)', async () => {
    const { user, router } = renderRoute('/dashboard', { user: unverified });

    const banner = await screen.findByText('Please verify your email address');
    await user.click(
      within(banner.closest('[role]') ?? document.body).getByRole('link', {
        name: 'Resend the email',
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings · Account' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/settings/account');
    expect(screen.queryByRole('link', { name: 'Resend the email' })).not.toBeInTheDocument();
  });
});

describe('Settings › Appearance', () => {
  it('switches the theme and reduces motion, remembered on this device', async () => {
    const { user } = renderRoute('/settings/appearance', { user: verified });

    await user.click(await screen.findByRole('radio', { name: /^Dark/ }));
    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('tms.theme')).toBe('dark');

    await user.click(screen.getByRole('radio', { name: /^Reduce motion/ }));
    expect(document.documentElement).toHaveClass('reduce-motion');
    expect(window.localStorage.getItem(DEVICE_PREFERENCES_KEY)).toContain('"motion":"reduce"');
    expect(screen.getByRole('group', { name: 'Motion' })).toBeInTheDocument();
  });
});

describe('Settings › Preferences', () => {
  it('rows per page applies to task lists (a size in the URL still wins), and Reset restores defaults', async () => {
    const { listQueries } = serveTasks([], { currentUser: verified, projects: [] });
    const { user, router } = renderRoute('/settings/preferences', { user: verified });

    expect(await screen.findByText(/Saved in this browser only/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Rows per page'), '50');
    await router.navigate('/tasks');
    await waitFor(() => {
      expect(listQueries.at(-1)?.get('PageSize')).toBe('50');
    });
    expect(currentUrl(router)).toBe('/tasks'); // the preference isn't written into links

    await router.navigate('/tasks?size=10');
    await waitFor(() => {
      expect(listQueries.at(-1)?.get('PageSize')).toBe('10');
    });

    await router.navigate('/settings/preferences');
    await user.click(await screen.findByRole('button', { name: 'Reset to defaults' }));
    expect(await screen.findByText('Preferences reset')).toBeInTheDocument();
    expect(screen.getByLabelText('Rows per page')).toHaveValue('20');
  });

  it('chooses how long notifications stay, with a sample', async () => {
    const { user } = renderRoute('/settings/preferences', { user: verified });

    await user.click(await screen.findByRole('radio', { name: /^Long/ }));
    expect(window.localStorage.getItem(DEVICE_PREFERENCES_KEY)).toContain('"toastDuration":"long"');
    await user.click(screen.getByRole('button', { name: 'Show a sample notification' }));
    expect(await screen.findByText('This is a sample notification')).toBeInTheDocument();
  });
});
