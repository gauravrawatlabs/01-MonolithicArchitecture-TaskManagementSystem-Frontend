import { describe, expect, it } from 'vitest';

import { getSafeReturnUrl } from '@/utils/returnUrl';

describe('getSafeReturnUrl (open-redirect protection)', () => {
  it.each(['/tasks', '/projects/12/board', '/tasks?assignedToMe=true', '/a#section'])(
    'accepts the in-app path %s',
    (value) => {
      expect(getSafeReturnUrl(value, '/dashboard')).toBe(value);
    },
  );

  it.each([
    'https://evil.example',
    'http://localhost:3000/tasks',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'tasks',
  ])('rejects %s and uses the fallback', (value) => {
    expect(getSafeReturnUrl(value, '/dashboard')).toBe('/dashboard');
  });

  it.each([null, undefined, ''])('uses the fallback for %s', (value) => {
    expect(getSafeReturnUrl(value, '/dashboard')).toBe('/dashboard');
  });
});
