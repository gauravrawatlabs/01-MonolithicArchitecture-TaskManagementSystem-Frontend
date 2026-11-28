import { z } from 'zod';

/**
 * No "JIT" in Zod: by default it probes once whether `new Function` is allowed, which a strict
 * Content-Security-Policy (script-src without 'unsafe-eval', see deploy/security-headers.json) reports as a
 * violation. Every form schema imports this module, so the setting applies before any schema is used.
 */
z.config({ jitless: true });

/**
 * Reusable Zod building blocks. Limits and messages mirror the backend's FluentValidation rules
 * and Identity options, so the browser rejects exactly what the server would (and says it the same way).
 * Client validation is for fast feedback; the server remains the authority.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

/** Backend: PasswordRules (8–128, 4 unique chars) + StrongPassword() + Identity options. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MIN_UNIQUE_CHARS = 4;

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'upper', label: 'An upper-case letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A lower-case letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'A digit (0–9)', test: (p) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'A special character (e.g. ! ? # @)',
    test: (p) => /[^a-zA-Z0-9]/.test(p),
  },
  {
    // Identity's RequiredUniqueChars: not in the FluentValidation rules, but enforced when hashing.
    id: 'unique',
    label: `At least ${PASSWORD_MIN_UNIQUE_CHARS} different characters`,
    test: (p) => new Set(p).size >= PASSWORD_MIN_UNIQUE_CHARS,
  },
];

const PASSWORD_RULE_MESSAGES: Record<string, string> = {
  length: `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters long.`,
  upper: 'Password must contain at least one upper-case letter.',
  lower: 'Password must contain at least one lower-case letter.',
  digit: 'Password must contain at least one digit.',
  special: 'Password must contain at least one special character.',
  unique: `Password must use at least ${PASSWORD_MIN_UNIQUE_CHARS} different characters.`,
};

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(256, 'Email must be 256 characters or fewer.')
  .pipe(z.email('Enter a valid email address.'));

/** A strong password. Reports the FIRST unmet rule (the checklist shows all of them). */
export const passwordSchema = z
  .string()
  .min(1, 'Password is required.')
  .superRefine((password, context) => {
    const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
    if (failed) {
      context.addIssue({
        code: 'custom',
        message: PASSWORD_RULE_MESSAGES[failed.id] ?? 'Password is too weak.',
      });
    }
  });

/** Required, trimmed text with a maximum length, e.g. requiredText('First name', 50). */
export function requiredText(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be ${maxLength} characters or fewer.`);
}

/** Passwords-match check that runs as soon as both fields have a value (not only when all else is valid). */
export function passwordsMatch<T extends z.ZodType<Record<string, unknown>>>(
  schema: T,
  passwordField: string,
  confirmField: string,
) {
  return schema.refine((values) => values[passwordField] === values[confirmField], {
    path: [confirmField],
    error: 'Passwords do not match.',
    when: (payload) => {
      const value = payload.value as Record<string, unknown>;
      return (
        typeof value[passwordField] === 'string' &&
        typeof value[confirmField] === 'string' &&
        value[confirmField] !== ''
      );
    },
  });
}
