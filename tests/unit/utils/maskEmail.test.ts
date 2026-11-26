import { describe, expect, it } from 'vitest';

import { maskEmail } from '@/utils/maskEmail';

describe('maskEmail', () => {
  it.each([
    ['jane.doe@example.com', 'j***@example.com'],
    ['a@b.co', 'a***@b.co'],
    ['first@sub@example.com', 'f***@example.com'],
    ['not-an-email', 'not-an-email'],
    ['@example.com', '@example.com'],
  ])('%s → %s', (input, expected) => {
    expect(maskEmail(input)).toBe(expected);
  });
});
