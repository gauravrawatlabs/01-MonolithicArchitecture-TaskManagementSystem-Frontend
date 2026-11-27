import { z } from 'zod';

import { requiredText } from '@/schemas/common';

/** Mirrors CategoryRules (backend): name 1–100 (not blank), description ≤ 500, both trimmed. */
export const CATEGORY_NAME_MAX = 100;
export const CATEGORY_DESCRIPTION_MAX = 500;

export const categorySchema = z.object({
  name: requiredText('Name', CATEGORY_NAME_MAX),
  description: z
    .string()
    .trim()
    .max(
      CATEGORY_DESCRIPTION_MAX,
      `Description must be ${CATEGORY_DESCRIPTION_MAX} characters or fewer.`,
    ),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

/** Form values → request body. An empty description is sent as null, like the backend stores it. */
export function toCategoryRequest(values: CategoryFormValues) {
  return { name: values.name, description: values.description === '' ? null : values.description };
}
