import { z } from 'zod';

import { requiredText } from '@/schemas/common';
import { type CreateTaskRequest, type TaskPriority, type UpdateTaskRequest } from '@/types/api';

import { isAfterProjectEnd, localInputToUtc } from '../dueDates';

/** Mirrors TaskRules (backend): title 1–200, description ≤ 4000. */
export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 4000;
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const satisfies readonly TaskPriority[];

export interface TaskSchemaContext {
  /** Now (injected for tests). */
  now: () => Date;
  /** The due date the task had when the form opened (edit): unchanged past dates are allowed. */
  originalDueUtc?: string | null;
  /** End date ("yyyy-MM-dd") of the selected project, if known. */
  projectEndDate: (projectId: number) => string | null | undefined;
}

/**
 * One schema for create and edit. Field values are strings (what inputs give); `toCreateRequest` /
 * `toUpdateRequest` convert. Rules that depend on time or on the project are checked with the context:
 *  • a NEW or CHANGED due date must be in the future (create: always; edit: only if changed — as the API);
 *  • it must not fall after the project's end date (compared like the API: UTC calendar date).
 */
export function createTaskSchema(context: TaskSchemaContext) {
  return z
    .object({
      projectId: z.string().regex(/^\d+$/, 'Choose a project.'),
      title: requiredText('Title', TASK_TITLE_MAX),
      description: z
        .string()
        .trim()
        .max(
          TASK_DESCRIPTION_MAX,
          `Description must be ${TASK_DESCRIPTION_MAX} characters or fewer.`,
        ),
      priority: z.enum(PRIORITIES),
      categoryId: z.string(),
      dueDate: z.string(),
      assigneeId: z.string(),
    })
    .superRefine((values, issue) => {
      if (!values.dueDate) return;
      const dueUtc = localInputToUtc(values.dueDate);
      if (!dueUtc) {
        issue.addIssue({
          code: 'custom',
          path: ['dueDate'],
          message: 'Enter a valid date and time.',
        });
        return;
      }
      // datetime-local has minute precision: compare to the minute, or an untouched value counts as changed.
      const original = context.originalDueUtc;
      const changed = !original || !sameMinute(dueUtc, original);
      if (changed && new Date(dueUtc) <= context.now()) {
        issue.addIssue({
          code: 'custom',
          path: ['dueDate'],
          message: 'Due date must be in the future.',
        });
        return;
      }
      const end = context.projectEndDate(Number(values.projectId));
      if (changed && isAfterProjectEnd(dueUtc, end)) {
        issue.addIssue({
          code: 'custom',
          path: ['dueDate'],
          message: `The due date must not be after the project's end date (${end ?? ''}).`,
        });
      }
    });
}

export type TaskFormValues = z.infer<ReturnType<typeof createTaskSchema>>;

function sameMinute(a: string, b: string): boolean {
  return Math.floor(new Date(a).getTime() / 60_000) === Math.floor(new Date(b).getTime() / 60_000);
}

const optionalId = (value: string) => (value === '' ? null : Number(value));

export function toCreateRequest(values: TaskFormValues): CreateTaskRequest {
  return {
    projectId: Number(values.projectId),
    title: values.title,
    description: values.description === '' ? null : values.description,
    priority: values.priority,
    categoryId: optionalId(values.categoryId),
    dueDateUtc: localInputToUtc(values.dueDate),
  };
}

export function toUpdateRequest(
  values: TaskFormValues,
  originalDueUtc: string | null,
): UpdateTaskRequest {
  const dueUtc = localInputToUtc(values.dueDate);
  return {
    title: values.title,
    description: values.description === '' ? null : values.description,
    priority: values.priority,
    categoryId: optionalId(values.categoryId),
    // Unchanged (to the minute) → send the ORIGINAL value, so seconds can't turn it into a "change".
    dueDateUtc:
      dueUtc !== null && originalDueUtc && sameMinute(dueUtc, originalDueUtc)
        ? originalDueUtc
        : dueUtc,
  };
}
