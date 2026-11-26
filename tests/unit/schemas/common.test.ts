import { describe, expect, it } from 'vitest';

import { emailSchema, PASSWORD_RULES, passwordSchema, requiredText } from '@/schemas/common';

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('passwordSchema (mirrors the backend StrongPassword rule + Identity options)', () => {
  it('accepts a password that meets every rule', () => {
    expect(passwordSchema.safeParse('Str0ng!Pass').success).toBe(true);
  });

  it.each([
    ['', 'Password is required.'],
    ['Ab1!', 'Password must be 8–128 characters long.'],
    [`Aa1!${'x'.repeat(125)}`, 'Password must be 8–128 characters long.'],
    ['lower1!case', 'Password must contain at least one upper-case letter.'],
    ['UPPER1!CASE', 'Password must contain at least one lower-case letter.'],
    ['NoDigits!!', 'Password must contain at least one digit.'],
    ['NoSpecial12', 'Password must contain at least one special character.'],
  ])('rejects %j with "%s"', (password, message) => {
    expect(firstError(passwordSchema.safeParse(password))).toBe(message);
  });

  // Mirrors Identity's RequiredUniqueChars = 4. Note: a password that has an upper-case letter, a
  // lower-case letter, a digit and a special character always has ≥ 4 distinct characters, so this
  // rule can never be the deciding failure in a full password; it is tested on its own.
  it('enforces Identity RequiredUniqueChars = 4 (not in FluentValidation, but enforced when hashing)', () => {
    const rule = PASSWORD_RULES.find((r) => r.id === 'unique');
    expect(rule?.test('aaaaaaa')).toBe(false);
    expect(rule?.test('abcabca')).toBe(false); // 3 distinct
    expect(rule?.test('abcdabc')).toBe(true); // 4 distinct
  });

  it('exposes one checklist entry per rule, each testable on its own', () => {
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual([
      'length',
      'upper',
      'lower',
      'digit',
      'special',
      'unique',
    ]);
    expect(PASSWORD_RULES.every((r) => r.test('Str0ng!Pass'))).toBe(true);
  });
});

describe('emailSchema', () => {
  it('trims and accepts a valid address', () => {
    expect(emailSchema.parse('  jane@example.com ')).toBe('jane@example.com');
  });

  it.each([
    ['', 'Email is required.'],
    ['   ', 'Email is required.'],
    ['jane@', 'Enter a valid email address.'],
    ['jane.example.com', 'Enter a valid email address.'],
    [`${'a'.repeat(251)}@x.com`, 'Email must be 256 characters or fewer.'], // 257 characters
  ])('rejects %j', (value, message) => {
    expect(firstError(emailSchema.safeParse(value))).toBe(message);
  });
});

describe('requiredText', () => {
  const firstName = requiredText('First name', 50);

  it('trims, requires a value and limits the length', () => {
    expect(firstName.parse('  Jane ')).toBe('Jane');
    expect(firstError(firstName.safeParse('   '))).toBe('First name is required.');
    expect(firstError(firstName.safeParse('x'.repeat(51)))).toBe(
      'First name must be 50 characters or fewer.',
    );
  });
});
