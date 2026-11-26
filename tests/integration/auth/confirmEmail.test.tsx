import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { buildUser } from '../../mocks/factories/users';
import { server } from '../../mocks/server';
import { currentUrl, renderRoute } from '../../utils/renderRoute';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const CONFIRM_URL = `/confirm-email?userId=${USER_ID}&token=TOKEN_123`;

describe('Confirm email (link from email)', () => {
  it('confirms automatically, sending exactly ONE request even under StrictMode', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/confirm-email',
      () => new HttpResponse(null, { status: 204 }),
    );
    renderRoute(CONFIRM_URL, { strict: true });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Email confirmed' }),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual({ userId: USER_ID, token: 'TOKEN_123' });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('explains an incomplete link and offers a new one', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/confirm-email',
      () => new HttpResponse(null, { status: 204 }),
    );
    renderRoute('/confirm-email?userId=not-a-guid&token=x');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'This confirmation link is incomplete',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send a new confirmation link' }),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('offers a new link when the token is invalid or expired', async () => {
    server.use(
      http.post(apiUrl('/api/account/confirm-email'), () =>
        problem(400, {
          errors: { token: ['The link is invalid or has expired. Please request a new one.'] },
        }),
      ),
    );
    const resendCalls = captureRequests(
      'post',
      '/api/account/resend-confirmation',
      () => new HttpResponse(null, { status: 202 }),
    );
    const { user } = renderRoute(CONFIRM_URL);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'This confirmation link has expired' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Send a new confirmation link' }));

    const toasts = screen.getByRole('region', { name: /notifications/i });
    expect(await within(toasts).findByText('Confirmation email sent')).toBeInTheDocument();
    expect(resendCalls[0]?.body).toEqual({ email: 'jane@example.com' });
  });

  it('lets the user retry after a server error', async () => {
    let attempts = 0;
    server.use(
      http.post(apiUrl('/api/account/confirm-email'), () => {
        attempts += 1;
        return attempts === 1 ? problem(503) : new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderRoute(CONFIRM_URL);

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Email confirmed' }),
    ).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it('refreshes the signed-in user so the "verify your email" banner disappears', async () => {
    server.use(
      http.get(apiUrl('/api/auth/me'), () =>
        HttpResponse.json(buildUser({ firstName: 'Nina', emailConfirmed: true })),
      ),
    );
    const { user, router } = renderRoute(CONFIRM_URL, {
      user: buildUser({ firstName: 'Nina', emailConfirmed: false }),
    });

    await user.click(await screen.findByRole('link', { name: 'Go to dashboard' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/dashboard');
    expect(screen.queryByText('Please verify your email address')).not.toBeInTheDocument();
  });
});
