import { describe, expect, it } from 'vitest';

import { localInputToUtc, utcToLocalInput } from '@/features/tasks/dueDates';
import {
  createTaskSchema,
  toCreateRequest,
  toUpdateRequest,
} from '@/features/tasks/schemas/taskSchema';

const now = new Date('2026-11-27T12:00:00Z');
const base = {
  projectId: '7',
  title: 'Write docs',
  description: '',
  priority: 'Medium' as const,
  categoryId: '',
  dueDate: '',
  assigneeId: '',
};
const local = (iso: string) => utcToLocalInput(iso);
function errorsOf(
  values: object,
  options: { originalDueUtc?: string | null; end?: string | null } = {},
) {
  const schema = createTaskSchema({
    now: () => now,
    originalDueUtc: options.originalDueUtc,
    projectEndDate: () => options.end,
  });
  const result = schema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
}

describe('task form schema', () => {
  it('needs a project and a title (1–200), description ≤ 4000', () => {
    expect(errorsOf({ ...base, projectId: '' })).toEqual({ projectId: 'Choose a project.' });
    expect(errorsOf({ ...base, title: '  ' })).toEqual({ title: 'Title is required.' });
    expect(errorsOf({ ...base, title: 'x'.repeat(201) })).toHaveProperty('title');
    expect(errorsOf({ ...base, description: 'x'.repeat(4001) })).toHaveProperty('description');
  });

  it('requires a NEW due date in the future', () => {
    expect(errorsOf({ ...base, dueDate: local('2026-11-27T11:00:00Z') })).toEqual({
      dueDate: 'Due date must be in the future.',
    });
    expect(errorsOf({ ...base, dueDate: local('2026-11-28T11:00:00Z') })).toEqual({});
  });

  it('allows an UNCHANGED past due date when editing (as the API does), even with seconds stored', () => {
    const original = '2026-11-20T09:00:30.000Z';
    expect(errorsOf({ ...base, dueDate: local(original) }, { originalDueUtc: original })).toEqual(
      {},
    );
    expect(
      errorsOf({ ...base, dueDate: local('2026-11-21T09:00:00Z') }, { originalDueUtc: original }),
    ).toHaveProperty('dueDate');
  });

  it("rejects a due date after the project's end date (UTC calendar date)", () => {
    expect(
      errorsOf({ ...base, dueDate: local('2026-12-02T10:00:00Z') }, { end: '2026-12-01' }),
    ).toEqual({
      dueDate: "The due date must not be after the project's end date (2026-12-01).",
    });
    expect(
      errorsOf({ ...base, dueDate: local('2026-12-01T10:00:00Z') }, { end: '2026-12-01' }),
    ).toEqual({});
  });

  it('builds the create request: ids as numbers, empty values as null, due date in UTC', () => {
    const dueDate = local('2026-12-05T15:00:00Z');
    expect(toCreateRequest({ ...base, categoryId: '3', dueDate })).toEqual({
      projectId: 7,
      title: 'Write docs',
      description: null,
      priority: 'Medium',
      categoryId: 3,
      dueDateUtc: localInputToUtc(dueDate),
    });
  });

  it('sends the ORIGINAL due date back when unchanged, so seconds never count as a change', () => {
    const original = '2026-11-20T09:00:30.000Z';
    expect(toUpdateRequest({ ...base, dueDate: local(original) }, original).dueDateUtc).toBe(
      original,
    );
    expect(toUpdateRequest({ ...base, dueDate: '' }, original).dueDateUtc).toBeNull();
  });
});
