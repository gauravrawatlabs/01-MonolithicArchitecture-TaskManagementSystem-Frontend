import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { getAccessToken } from '@/services/tokenStorage';

import { apiUrl, problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { buildAuthResponse } from '../../mocks/factories/auth';
import { buildUser } from '../../mocks/factories/users';
import { server } from '../../mocks/server';
import { currentUrl, renderRoute } from '../../utils/renderRoute';

describe('Login', () => {
  it('validates in the browser before calling the API and focuses the first problem', async () => {
    const calls = captureRequests('post', '/api/auth/login', () =>
      HttpResponse.json(buildAuthResponse()),
    );
    const { user } = renderRoute('/login');
    await screen.findByRole('heading', { level: 1, name: 'Welcome back' });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
  });

  it('rejects a malformed email address', async () => {
    const { user } = renderRoute('/login');
    await user.type(await screen.findByLabelText('Email'), 'jane@');
    await user.type(screen.getByLabelText('Password'), 'whatever');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('signs in, stores the session and continues to the dashboard', async () => {
    const response = buildAuthResponse(buildUser({ firstName: 'Jane', lastName: 'Doe' }), {
      accessToken: 'jwt-1',
    });
    const calls = captureRequests('post', '/api/auth/login', () => HttpResponse.json(response));
    const { user, router } = renderRoute('/login');

    await user.type(await screen.findByLabelText('Email'), '  jane@example.com ');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/dashboard');
    expect(calls[0]?.body).toEqual({ email: 'jane@example.com', password: 'Str0ng!Pass' }); // trimmed
    expect(getAccessToken()).toBe('jwt-1');
    expect(screen.getByRole('button', { name: 'Account menu for Jane Doe' })).toBeInTheDocument();
  });

  it('returns to the returnUrl after signing in', async () => {
    const { user, router } = renderRoute('/login?returnUrl=%2Ftasks%3FassignedToMe%3Dtrue');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My tasks' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/tasks?assignedToMe=true');
  });

  it('shows ONE generic message for wrong credentials, without blaming a field', async () => {
    server.use(
      http.post(apiUrl('/api/auth/login'), () =>
        problem(401, { title: 'Unauthorized', detail: 'Invalid email or password.' }),
      ),
    );
    const { user } = renderRoute('/login');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid');
    expect(getAccessToken()).toBeNull();
  });

  it('explains a network failure', async () => {
    server.use(http.post(apiUrl('/api/auth/login'), () => HttpResponse.error()));
    const { user } = renderRoute('/login');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server");
  });

  it('disables the button while signing in (no double submit)', async () => {
    server.use(
      http.post(apiUrl('/api/auth/login'), async () => {
        await delay(200);
        return HttpResponse.json(buildAuthResponse());
      }),
    );
    const { user } = renderRoute('/login');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
  });

  it('signs out through the API with the refresh token and clears the session', async () => {
    const logoutCalls = captureRequests(
      'post',
      '/api/auth/logout',
      () => new HttpResponse(null, { status: 204 }),
    );
    const { user, router } = renderRoute('/login');
    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: /Account menu for/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login');
    expect(getAccessToken()).toBeNull();
    await waitFor(() => {
      expect(logoutCalls[0]?.body).toEqual({ refreshToken: 'test-refresh-token' });
    });
  });

  it('still signs out locally when the logout request fails', async () => {
    server.use(http.post(apiUrl('/api/auth/logout'), () => HttpResponse.error()));
    const { user } = renderRoute('/login');
    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });

    await user.click(screen.getByRole('button', { name: /Account menu for/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome back' }),
    ).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });
});
