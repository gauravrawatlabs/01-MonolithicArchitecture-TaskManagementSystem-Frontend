import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/apiError';
import { applyServerErrors, toFormPath } from '@/utils/formErrors';

interface Values {
  email: string;
  password: string;
  roles: string[];
}

const fields = ['email', 'password', 'roles'] as const;

describe('toFormPath', () => {
  it('converts ASP.NET index notation to React Hook Form paths', () => {
    expect(toFormPath('roles[0]')).toBe('roles.0');
    expect(toFormPath('items[2].name')).toBe('items.2.name');
    expect(toFormPath('email')).toBe('email');
  });
});

describe('applyServerErrors', () => {
  it('puts 400 field errors under their fields and focuses the first one', () => {
    const setError = vi.fn();
    const error = new ApiError({
      kind: 'validation',
      status: 400,
      fieldErrors: { email: ['Email is required.'], password: ['Too short.', 'Needs a digit.'] },
    });

    applyServerErrors<Values>(setError, error, { fields: [...fields] });

    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'Email is required.' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenCalledWith(
      'password',
      { type: 'server', message: 'Too short. Needs a digit.' },
      { shouldFocus: false },
    );
    expect(setError).not.toHaveBeenCalledWith('root.server', expect.anything());
  });

  it('maps an API field name to a differently named form field (fieldAliases)', () => {
    const setError = vi.fn();
    const error = new ApiError({
      kind: 'validation',
      status: 400,
      fieldErrors: { dueDateUtc: ['Due date must be in the future.'] },
    });

    applyServerErrors<{ dueDate: string }>(setError, error, {
      fields: ['dueDate'],
      fieldAliases: { dueDateUtc: 'dueDate' },
    });

    expect(setError).toHaveBeenCalledWith(
      'dueDate',
      { type: 'server', message: 'Due date must be in the future.' },
      { shouldFocus: true },
    );
    expect(setError).not.toHaveBeenCalledWith('root.server', expect.anything());
  });

  it('maps indexed keys (roles[0]) to nested paths', () => {
    const setError = vi.fn();
    applyServerErrors<Values>(
      setError,
      new ApiError({
        kind: 'validation',
        status: 400,
        fieldErrors: { 'roles[0]': ['Unknown role.'] },
      }),
      { fields: [...fields] },
    );

    expect(setError).toHaveBeenCalledWith(
      'roles.0',
      { type: 'server', message: 'Unknown role.' },
      { shouldFocus: true },
    );
  });

  it('shows errors for fields the form does not have as one form-level message', () => {
    const setError = vi.fn();
    applyServerErrors<Values>(
      setError,
      new ApiError({
        kind: 'validation',
        status: 400,
        fieldErrors: { token: ['The link is invalid or has expired.'] },
      }),
      { fields: [...fields] },
    );

    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'The link is invalid or has expired.',
    });
  });

  it('puts a mapped status (409 → email) under that field', () => {
    const setError = vi.fn();
    applyServerErrors<Values>(
      setError,
      new ApiError({
        kind: 'conflict',
        status: 409,
        detail: 'An account with this email address already exists.',
      }),
      { fields: [...fields], statusToField: { 409: 'email' } },
    );

    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'An account with this email address already exists.' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenCalledTimes(1);
  });

  it('shows anything else (401, network, 500) as a safe form-level message', () => {
    const setError = vi.fn();
    applyServerErrors<Values>(
      setError,
      new ApiError({ kind: 'server', status: 500, detail: 'stack trace…' }),
      {
        fields: [...fields],
      },
    );

    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Something went wrong on our side. Please try again in a moment.',
    });
  });
});
