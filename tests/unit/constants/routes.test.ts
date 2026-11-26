import { describe, expect, it } from 'vitest';

import { loginWithReturnUrl, paths } from '@/constants/routes';

describe('route paths', () => {
  it('keeps the two paths the backend puts into emails', () => {
    expect(paths.confirmEmail).toBe('/confirm-email');
    expect(paths.resetPassword).toBe('/reset-password');
  });

  it('builds parameterised paths', () => {
    expect(paths.project(12)).toBe('/projects/12');
    expect(paths.projectBoard(12)).toBe('/projects/12/board');
    expect(paths.task(142)).toBe('/tasks/142');
    expect(paths.settings()).toBe('/settings/account');
    expect(paths.settings('security')).toBe('/settings/security');
  });

  it('encodes the returnUrl for the login link', () => {
    expect(loginWithReturnUrl('/tasks?assignedToMe=true')).toBe(
      '/login?returnUrl=%2Ftasks%3FassignedToMe%3Dtrue',
    );
  });
});
