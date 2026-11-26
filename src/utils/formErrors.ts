import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';

import { getErrorMessage, toApiError } from '@/api/apiError';

/** Key used for form-level (not field-specific) errors: errors.root.server.message */
export const ROOT_SERVER_ERROR = 'root.server' as const;

export interface ApplyServerErrorsOptions<TValues extends FieldValues> {
  /** Fields that exist in this form. Server errors for other keys become a form-level message. */
  fields: readonly Path<TValues>[];
  /**
   * Errors without an `errors` object that belong to one field, by status code.
   * Example: register → { 409: 'email' } ("An account with this email already exists").
   */
  statusToField?: Partial<Record<number, Path<TValues>>>;
}

/** "roles[0]" (ASP.NET style) → "roles.0" (React Hook Form path). */
export function toFormPath(serverKey: string): string {
  return serverKey.replace(/\[(\d+)\]/g, '.$1');
}

/**
 * Puts an API error where the user will see it (docs/02 §9):
 *   400 with `errors` → under each matching field (first one focused); unknown keys → form-level
 *   status mapped in `statusToField` → under that field
 *   anything else → form-level message (FormErrorSummary)
 */
export function applyServerErrors<TValues extends FieldValues>(
  setError: UseFormSetError<TValues>,
  error: unknown,
  { fields, statusToField = {} }: ApplyServerErrorsOptions<TValues>,
): void {
  const apiError = toApiError(error);
  const known = new Set<string>(fields);
  const unmatched: string[] = [];
  let focused = false;

  for (const [key, messages] of Object.entries(apiError.fieldErrors)) {
    const path = toFormPath(key);
    const rootField = path.split('.')[0] ?? path;
    if (known.has(rootField)) {
      setError(
        path as Path<TValues>,
        { type: 'server', message: messages.join(' ') },
        { shouldFocus: !focused },
      );
      focused = true;
    } else {
      unmatched.push(...messages);
    }
  }

  const statusField = apiError.status !== undefined ? statusToField[apiError.status] : undefined;
  if (statusField && !focused) {
    setError(
      statusField,
      { type: 'server', message: getErrorMessage(apiError) },
      { shouldFocus: true },
    );
    focused = true;
  }

  if (unmatched.length > 0) {
    setError(ROOT_SERVER_ERROR, { type: 'server', message: unmatched.join(' ') });
  } else if (!focused) {
    setError(ROOT_SERVER_ERROR, { type: 'server', message: getErrorMessage(apiError) });
  }
}
