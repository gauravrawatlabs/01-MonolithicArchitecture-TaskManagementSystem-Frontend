import { useId } from 'react';

import { cn } from '@/utils/cn';

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/**
 * A labelled group of radio buttons drawn as cards. Native radios: arrow keys move between them, the group
 * has one tab stop, and screen readers announce "1 of 3" (no custom ARIA needed).
 */
export function ChoiceGroup<T extends string>({
  legend,
  description,
  choices,
  value,
  onChange,
}: {
  legend: string;
  description?: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  const descriptionId = `${name}-description`;
  return (
    <fieldset aria-describedby={description ? descriptionId : undefined}>
      <legend className="text-sm font-semibold">{legend}</legend>
      {description ? (
        <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {choices.map((choice) => (
          <label
            key={choice.value}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-lg border bg-surface p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
              value === choice.value && 'border-primary bg-primary-soft/40',
            )}
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => {
                onChange(choice.value);
              }}
              className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-none"
            />
            <span>
              <span className="block font-medium text-foreground">{choice.label}</span>
              {choice.description ? (
                <span className="text-xs text-muted-foreground">{choice.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
