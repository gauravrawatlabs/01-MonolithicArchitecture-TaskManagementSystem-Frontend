import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { server } from '../../mocks/server';
import { currentUrl, renderRoute } from '../../utils/renderRoute';

const RESET_URL = '/reset-password?email=jane%40example.com&token=abc_DEF-123';

describe('Forgot password', () => {
  it('always shows the same neutral confirmation (no account enumeration)', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/forgot-password',
      () => new HttpResponse(null, { status: 202 }),
    );
    const { user } = renderRoute('/forgot-password');

    await user.type(await screen.findByLabelText('Email'), 'unknown@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Check your email' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/If an account exists for that address/)).toBeInTheDocument();
    expect(calls[0]?.body).toEqual({ email: 'unknown@example.com' });
  });

  it('validates the email first', async () => {
    const { user } = renderRoute('/forgot-password');

    await user.click(await screen.findByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
  });

  it('shows a server failure in the form and keeps it usable', async () => {
    server.use(
      http.post(apiUrl('/api/account/forgot-password'), () =>
        problem(500, { detail: 'stack trace' }),
      ),
    );
    const { user } = renderRoute('/forgot-password');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side');
    expect(screen.queryByText('stack trace')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  });
});

describe('Reset password (link from email)', () => {
  it('explains an incomplete link instead of showing a form that cannot work', async () => {
    renderRoute('/reset-password?email=jane%40example.com');

    expect(
      await screen.findByRole('heading', { level: 1, name: "This reset link can't be used" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('resets the password with the email and token from the link, then asks to sign in', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/reset-password',
      () => new HttpResponse(null, { status: 204 }),
    );
    const { user, router } = renderRoute(RESET_URL);

    expect(await screen.findByText('j***@example.com')).toBeInTheDocument();
    await user.type(screen.getByLabelText('New password'), 'N3w!Password');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Password');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(
      await screen.findByText('Your password has been reset. Sign in with your new password.'),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login');
    expect(calls[0]?.body).toEqual({
      email: 'jane@example.com',
      token: 'abc_DEF-123',
      newPassword: 'N3w!Password',
    });
  });

  it('replaces the form with "request a new link" when the token is invalid or expired', async () => {
    captureRequests('post', '/api/account/reset-password', () =>
      problem(400, {
        errors: { token: ['The link is invalid or has expired. Please request a new one.'] },
      }),
    );
    const { user } = renderRoute(RESET_URL);

    await user.type(await screen.findByLabelText('New password'), 'N3w!Password');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Password');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: "This reset link can't be used" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/invalid or has expired/)).toBeInTheDocument();
  });

  it('shows a password-policy error from the server under the new password', async () => {
    captureRequests('post', '/api/account/reset-password', () =>
      problem(400, {
        errors: { newPassword: ['Passwords must use at least 4 different characters.'] },
      }),
    );
    const { user } = renderRoute(RESET_URL);

    await user.type(await screen.findByLabelText('New password'), 'N3w!Password');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Password');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(
      await screen.findByText('Passwords must use at least 4 different characters.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not submit mismatched passwords', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/reset-password',
      () => new HttpResponse(null, { status: 204 }),
    );
    const { user } = renderRoute(RESET_URL);

    await user.type(await screen.findByLabelText('New password'), 'N3w!Password');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Passw0rd');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});
