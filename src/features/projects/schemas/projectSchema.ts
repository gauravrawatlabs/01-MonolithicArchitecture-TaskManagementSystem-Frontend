import { z } from 'zod';

import { requiredText } from '@/schemas/common';

/** Mirrors ProjectRules (backend): name 1–150, description ≤ 2000, end date on or after start date. */
export const PROJECT_NAME_MAX = 150;
export const PROJECT_DESCRIPTION_MAX = 2000;

/** "" (empty date input) or a calendar date "yyyy-MM-dd": the backend's DateOnly, no time zone. */
const optionalDate = z.union([z.literal(''), z.iso.date('Enter a valid date.')]);

export const projectSchema = z
  .object({
    name: requiredText('Name', PROJECT_NAME_MAX),
    description: z
      .string()
      .trim()
      .max(
        PROJECT_DESCRIPTION_MAX,
        `Description must be ${PROJECT_DESCRIPTION_MAX} characters or fewer.`,
      ),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((values) => !values.startDate || !values.endDate || values.endDate >= values.startDate, {
    path: ['endDate'],
    error: 'End date must be on or after the start date.',
  });

export type ProjectFormValues = z.infer<typeof projectSchema>;

/** Form values → request body: empty strings become null (how the backend stores "not set"). */
export function toProjectRequest(values: ProjectFormValues) {
  return {
    name: values.name,
    description: values.description === '' ? null : values.description,
    startDate: values.startDate === '' ? null : values.startDate,
    endDate: values.endDate === '' ? null : values.endDate,
  };
}
