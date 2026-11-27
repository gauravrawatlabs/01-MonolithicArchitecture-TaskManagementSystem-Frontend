import { describe, expect, it } from 'vitest';

import { projectSchema, toProjectRequest } from '@/features/projects/schemas/projectSchema';

const valid = { name: 'Website', description: '', startDate: '', endDate: '' };
const errorsOf = (values: object) => {
  const result = projectSchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('projectSchema', () => {
  it('accepts a name only, and trims it', () => {
    expect(projectSchema.parse({ ...valid, name: '  Website  ' }).name).toBe('Website');
  });

  it('enforces the backend limits: name 1–150, description ≤ 2000', () => {
    expect(errorsOf({ ...valid, name: '   ' })).toEqual({ name: 'Name is required.' });
    expect(errorsOf({ ...valid, name: 'x'.repeat(151) })).toHaveProperty('name');
    expect(errorsOf({ ...valid, name: 'x'.repeat(150) })).toEqual({});
    expect(errorsOf({ ...valid, description: 'x'.repeat(2001) })).toHaveProperty('description');
  });

  it('requires the end date on or after the start date (same day allowed), reported on the end date', () => {
    expect(errorsOf({ ...valid, startDate: '2026-12-10', endDate: '2026-12-09' })).toEqual({
      endDate: 'End date must be on or after the start date.',
    });
    expect(errorsOf({ ...valid, startDate: '2026-12-10', endDate: '2026-12-10' })).toEqual({});
    expect(errorsOf({ ...valid, endDate: '2026-12-01' })).toEqual({}); // only one date: fine
  });

  it('rejects something that is not a calendar date', () => {
    expect(errorsOf({ ...valid, startDate: '2026-02-30' })).toHaveProperty('startDate');
  });

  it('sends empty optional fields as null', () => {
    expect(toProjectRequest(projectSchema.parse(valid))).toEqual({
      name: 'Website',
      description: null,
      startDate: null,
      endDate: null,
    });
  });
});
