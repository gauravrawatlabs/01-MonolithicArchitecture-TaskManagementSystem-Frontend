import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouteErrorPage } from '@/app/router/pages/RouteErrorPage';
import { AppLayout } from '@/app/layouts/AppLayout';

import { buildUser } from '../mocks/factories/users';
import { setViewportWidth } from '../utils/matchMedia';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const admin = buildUser({ firstName: 'Ada', lastName: 'Admin', roles: ['Admin'] });
const manager = buildUser({ firstName: 'Max', lastName: 'Manager', roles: ['Manager'] });
const member = buildUser({ firstName: 'Uma', lastName: 'User', roles: ['User'] });

const mainNav = () => screen.getByRole('navigation', { name: 'Main' });

describe('Route guards', () => {
  it('sends a signed-out visitor to /login with the page they wanted as returnUrl', async () => {
    const { router } = renderRoute('/projects/12/board');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login?returnUrl=%2Fprojects%2F12%2Fboard');
  });

  it('returns to that page after signing in', async () => {
    const { router, user } = renderRoute('/projects/12/board');

    await user.type(await screen.findByLabelText('Email'), 'max@example.test');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Project #12' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/projects/12/board');
  });

  it('sends a signed-in user away from /login to the dashboard', async () => {
    const { router } = renderRoute('/login', { user: member });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/dashboard');
  });

  it('honours a safe in-app returnUrl', async () => {
    const { router } = renderRoute('/login?returnUrl=%2Ftasks%3FassignedToMe%3Dtrue', {
      user: member,
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'My tasks' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/tasks?assignedToMe=true');
  });

  it.each(['https://evil.example/phish', '//evil.example', '/\\evil.example'])(
    'ignores an external returnUrl (open-redirect protection): %s',
    async (returnUrl) => {
      const { router } = renderRoute(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, {
        user: member,
      });

      await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
      expect(currentUrl(router)).toBe('/dashboard');
    },
  );

  it('shows "Access denied" when a non-admin opens an admin page', async () => {
    const { router } = renderRoute('/admin/users', { user: manager });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Access denied' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/forbidden');
  });

  it('lets an admin open admin pages', async () => {
    renderRoute('/admin/users', { user: admin });

    expect(await screen.findByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown URLs', async () => {
    renderRoute('/no-such-page', { user: member });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('redirects /settings and unknown settings tabs to the Account tab', async () => {
    const first = renderRoute('/settings', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Settings · Account' });
    expect(currentUrl(first.router)).toBe('/settings/account');
    first.unmount();

    const second = renderRoute('/settings/bogus', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Settings · Account' });
    expect(currentUrl(second.router)).toBe('/settings/account');
  });
});

describe('Role-based navigation (Phase 1 §13)', () => {
  it('hides the Admin section from users without the Admin role', async () => {
    renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    expect(within(mainNav()).getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(within(mainNav()).queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(within(mainNav()).queryByRole('heading', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows the Admin section to admins', async () => {
    renderRoute('/dashboard', { user: admin });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    expect(within(mainNav()).getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(within(mainNav()).getByRole('link', { name: 'Users' })).toBeInTheDocument();
  });

  it('marks exactly one of "My tasks" / "All tasks" as the current page', async () => {
    const { user } = renderRoute('/tasks?assignedToMe=true', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'My tasks' });

    const myTasks = within(mainNav()).getByRole('link', { name: 'My tasks' });
    const allTasks = within(mainNav()).getByRole('link', { name: 'All tasks' });
    expect(myTasks).toHaveAttribute('aria-current', 'page');
    expect(allTasks).not.toHaveAttribute('aria-current');

    await user.click(allTasks);
    await screen.findByRole('heading', { level: 1, name: 'All tasks' });
    expect(allTasks).toHaveAttribute('aria-current', 'page');
    expect(myTasks).not.toHaveAttribute('aria-current');
  });

  it('shows the verify-email banner only to unverified users', async () => {
    renderRoute('/dashboard', { user: buildUser({ emailConfirmed: false }) });

    expect(await screen.findByText('Please verify your email address')).toBeInTheDocument();
  });
});

describe('Layout', () => {
  it('builds breadcrumbs and the document title from the route', async () => {
    renderRoute('/projects/12/members', { user: manager });
    await screen.findByRole('heading', { level: 1, name: 'Project #12' });

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(within(breadcrumb).getByRole('link', { name: 'Project #12' })).toHaveAttribute(
      'href',
      '/projects/12',
    );
    expect(within(breadcrumb).getByText('Members')).toHaveAttribute('aria-current', 'page');
    await waitFor(() => {
      expect(document.title).toBe('Members · Task Management System');
    });
  });

  it('project tabs are links with the current one marked', async () => {
    const { user, router } = renderRoute('/projects/12', { user: manager });
    const tabs = await screen.findByRole('navigation', { name: 'Project sections' });

    expect(within(tabs).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.click(within(tabs).getByRole('link', { name: 'Members' }));

    // Wait for what the user sees (the lazily loaded tab content), not just the router's URL:
    // the URL changes first and React renders a moment later.
    expect(await screen.findByText('Members coming soon')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/projects/12/members');
    expect(within(tabs).getByRole('link', { name: 'Members' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('offers a skip link to the main content', async () => {
    renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('collapses the desktop sidebar to an icon rail and remembers it', async () => {
    const { user } = renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    expect(within(mainNav()).getByText('Projects')).toBeInTheDocument(); // visible label

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(within(mainNav()).queryByText('Projects')).not.toBeInTheDocument();
    expect(within(mainNav()).getByRole('link', { name: 'Projects' })).toBeInTheDocument(); // aria-label
    expect(window.localStorage.getItem('tms.sidebar')).toBe('collapsed');
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
  });

  it('uses an icon rail without a collapse button on tablets', async () => {
    setViewportWidth(800);
    renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    expect(within(mainNav()).getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(within(mainNav()).queryByText('Projects')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /collapse sidebar/i })).not.toBeInTheDocument();
  });

  it('on phones, hides the sidebar and opens it as a drawer that closes after navigating', async () => {
    setViewportWidth(375);
    const { user, router } = renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    await user.click(within(drawer).getByRole('link', { name: 'Projects' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument();
    });
    // The drawer closes at once; the URL changes when the lazy page has loaded. Wait for the page.
    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/projects');
  });

  it('switches layouts live when the window is resized', async () => {
    renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();

    act(() => {
      setViewportWidth(375);
    });

    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
  });

  it('signs out from the user menu and returns to the sign-in page', async () => {
    const { user, router } = renderRoute('/dashboard', { user: member });
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: 'Account menu for Uma User' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login');
  });

  it('keeps the app shell working when a page crashes (route error boundary)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Boom(): never {
      throw new Error('Page crashed');
    }
    const routes = [
      {
        element: <AppLayout />,
        children: [
          { errorElement: <RouteErrorPage />, children: [{ path: '/boom', element: <Boom /> }] },
        ],
      },
    ];

    renderRoute('/boom', { user: member, routes });

    expect(await screen.findByText('Something went wrong on this page')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
