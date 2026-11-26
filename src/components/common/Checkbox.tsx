import { type ComponentProps, type ReactNode, useId } from 'react';

import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: ReactNode;
  description?: string;
}

/** Native checkbox (keyboard + screen reader support for free) with a clickable label. */
export function Checkbox({ label, description, id, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        aria-describedby={descriptionId}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-primary disabled:cursor-not-allowed"
        {...props}
      />
      <div className="grid gap-0.5">
        <label htmlFor={inputId} className="cursor-pointer text-sm font-medium text-foreground">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
