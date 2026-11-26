import { CircleAlert } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { cn } from '@/utils/cn';

/** The accessibility attributes FormField hands to its control. Spread them onto the input. */
export interface FormControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

export interface FormFieldProps {
  label: string;
  /** Render prop: receives the ids/ARIA attributes for the control. */
  children: (control: FormControlProps) => ReactNode;
  hint?: ReactNode;
  /** Error message (from Zod or the server). Shown below the control and announced. */
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

/**
 * Label + control + hint + error, correctly wired for screen readers:
 *   label[for]        → the control's id
 *   aria-describedby  → hint and error ids (read after the label)
 *   aria-invalid      → set when there is an error (also drives the red border styling)
 *
 * <FormField label="Title" required error={errors.title?.message}>
 *   {(control) => <Input {...control} {...register('title')} />}
 * </FormField>
 */
export function FormField({
  label,
  children,
  hint,
  error,
  required = false,
  id,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('grid gap-1.5', className)}>
      {/*
        The asterisk sits NEXT TO the label, not inside it, so the label's text is exactly the field
        name ("Email", not "Email*") for voice control and tests. aria-required on the control tells
        screen readers the field is required.
      */}
      <div className="flex items-baseline gap-0.5">
        <label htmlFor={controlId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {required ? (
          <span aria-hidden="true" className="text-sm text-danger">
            *
          </span>
        ) : null}
      </div>
      {children({
        id: controlId,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(required ? { 'aria-required': true as const } : {}),
      })}
      {/* <div>, not <p>: hints may contain block content such as the password checklist (<ul>). */}
      {hint ? (
        <div id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs font-medium text-danger">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
