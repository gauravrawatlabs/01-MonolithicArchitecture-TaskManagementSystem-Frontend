import { screen, within } from '@testing-library/react';
import { type UserEvent } from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { problem } from '../../mocks/api';
import { captureRequests } from '../../mocks/capture';
import { buildUser } from '../../mocks/factories/users';
import { currentUrl, renderRoute } from '../../utils/renderRoute';

async function fillRegistration(user: UserEvent, overrides: Partial<Record<string, string>> = {}) {
  const values = {
    'First name': 'Jane',
    'Last name': 'Doe',
    Email: 'jane.doe@example.com',
    Password: 'Str0ng!Pass',
    'Confirm password': 'Str0ng!Pass',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(label), value);
  }
}

describe('Registration', () => {
  it('shows the password requirements live as the user types', async () => {
    const { user } = renderRoute('/register');
    const upper = await screen.findByText(/An upper-case letter/);
    expect(upper).toHaveTextContent('(not met)');

    await user.type(screen.getByLabelText('Password'), 'A');

    expect(screen.getByText(/An upper-case letter/)).toHaveTextContent('(met)');
    expect(screen.getByText(/A digit/)).toHaveTextContent('(not met)');
  });

  it('links the requirements to the password field for screen readers', async () => {
    renderRoute('/register');

    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAccessibleDescription(
      expect.stringContaining('8–128 characters') as string,
    );
  });

  it('reports a weak password and mismatched confirmation before calling the API', async () => {
    const calls = captureRequests('post', '/api/auth/register', () =>
      HttpResponse.json(buildUser(), { status: 201 }),
    );
    const { user } = renderRoute('/register');
    await screen.findByRole('heading', { level: 1, name: 'Create your account' });

    await fillRegistration(user, { Password: 'weakpass', 'Confirm password': 'different' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Password must contain at least one upper-case letter.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('registers (without sending the confirmation field) and shows "check your email"', async () => {
    const calls = captureRequests('post', '/api/auth/register', () =>
      HttpResponse.json(buildUser({ emailConfirmed: false }), { status: 201 }),
    );
    const { user, router } = renderRoute('/register');
    await screen.findByRole('heading', { level: 1, name: 'Create your account' });

    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Check your email' }),
    ).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/register/success');
    expect(calls[0]?.body).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'Str0ng!Pass',
    });
    expect(screen.getByText('j***@example.com')).toBeInTheDocument();
    // \d+ rather than 60: a slow test run can legitimately reach 59 s before this line.
    expect(screen.getByRole('button', { name: /Resend email \(\d+ s\)/ })).toBeDisabled();
  });

  it('shows "email already exists" (409) on the email field and focuses it', async () => {
    captureRequests('post', '/api/auth/register', () =>
      problem(409, {
        title: 'Conflict',
        detail: 'An account with this email address already exists.',
      }),
    );
    const { user } = renderRoute('/register');
    await screen.findByRole('heading', { level: 1, name: 'Create your account' });

    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const email = screen.getByLabelText('Email');
    expect(
      await screen.findByText('An account with this email address already exists.'),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
  });

  it('shows server validation errors (400) under the matching fields', async () => {
    captureRequests('post', '/api/auth/register', () =>
      problem(400, {
        errors: { password: ['Passwords must have at least one non alphanumeric character.'] },
      }),
    );
    const { user } = renderRoute('/register');
    await screen.findByRole('heading', { level: 1, name: 'Create your account' });

    await fillRegistration(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const message = await screen.findByText(
      'Passwords must have at least one non alphanumeric character.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      expect.stringContaining(message.textContent) as string,
    );
  });
});

describe('Check your email (registration success)', () => {
  it('lets a direct visitor (no address in history) request a new link', async () => {
    const calls = captureRequests(
      'post',
      '/api/account/resend-confirmation',
      () => new HttpResponse(null, { status: 202 }),
    );
    const { user } = renderRoute('/register/success');

    await user.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: 'Send a new link' }));

    const toasts = await screen.findByRole('region', { name: /notifications/i });
    expect(await within(toasts).findByText('Confirmation email sent')).toBeInTheDocument();
    expect(calls[0]?.body).toEqual({ email: 'jane@example.com' });
  });

  it('uses the address from the registration step and enforces a cooldown', async () => {
    renderRoute('/register/success', { state: { email: 'jane@example.com' } });

    expect(await screen.findByText('j***@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend email/ })).toBeDisabled();
  });
});
