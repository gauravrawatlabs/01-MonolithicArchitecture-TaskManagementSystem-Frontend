import { describe, expect, it } from 'vitest';

import { cn } from '@/utils/cn';

describe('cn', () => {
  it('joins class names and skips falsy values', () => {
    const classNameFor = (isActive: boolean) =>
      cn('px-2', isActive && 'bg-primary', undefined, null, 'text-sm');

    expect(classNameFor(false)).toBe('px-2 text-sm');
    expect(classNameFor(true)).toBe('px-2 bg-primary text-sm');
  });

  it('lets the last conflicting Tailwind utility win, so callers can override defaults', () => {
    expect(cn('px-2 py-1 bg-surface', 'px-4')).toBe('py-1 bg-surface px-4');
  });

  it('keeps non-conflicting utilities of the same group', () => {
    expect(cn('text-sm', 'text-danger')).toBe('text-sm text-danger');
  });
});
