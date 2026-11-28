import { z } from 'zod';

import { requiredText } from '@/schemas/common';
import { type UpdateProfileRequest } from '@/types/api';

import { JOB_TITLE_MAX, NAME_MAX } from '../userRules';

export const profileSchema = z.object({
  firstName: requiredText('First name', NAME_MAX),
  lastName: requiredText('Last name', NAME_MAX),
  jobTitle: z
    .string()
    .trim()
    .max(JOB_TITLE_MAX, `Job title must be ${JOB_TITLE_MAX} characters or fewer.`),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export function toProfileRequest(values: ProfileValues): UpdateProfileRequest {
  return { ...values, jobTitle: values.jobTitle === '' ? null : values.jobTitle };
}
