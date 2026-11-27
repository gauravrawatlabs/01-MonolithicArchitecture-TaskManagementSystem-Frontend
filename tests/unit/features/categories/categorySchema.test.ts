import { describe, expect, it } from 'vitest';

import { categorySchema, toCategoryRequest } from '@/features/categories/schemas/categorySchema';

const messages = (input: unknown) =>
  categorySchema
    .safeParse(input)
    .error?.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`) ?? [];

describe('categorySchema (mirrors backend CategoryRules)', () => {
  it('trims both fields', () => {
    expect(categorySchema.parse({ name: '  Bug ', description: ' Defects ' })).toEqual({
      name: 'Bug',
      description: 'Defects',
    });
  });

  it('rejects a blank name, like NotEmpty() does for whitespace', () => {
    expect(messages({ name: '   ', description: '' })).toEqual(['name: Name is required.']);
  });

  it('enforces the maximum lengths (100 / 500)', () => {
    expect(messages({ name: 'x'.repeat(101), description: '' })).toEqual([
      'name: Name must be 100 characters or fewer.',
    ]);
    expect(messages({ name: 'Bug', description: 'x'.repeat(501) })).toEqual([
      'description: Description must be 500 characters or fewer.',
    ]);
    expect(messages({ name: 'x'.repeat(100), description: 'x'.repeat(500) })).toEqual([]);
  });
});

describe('toCategoryRequest', () => {
  it('sends an empty description as null (how the backend stores "no description")', () => {
    expect(toCategoryRequest({ name: 'Bug', description: '' })).toEqual({
      name: 'Bug',
      description: null,
    });
    expect(toCategoryRequest({ name: 'Bug', description: 'Defects' })).toEqual({
      name: 'Bug',
      description: 'Defects',
    });
  });
});
