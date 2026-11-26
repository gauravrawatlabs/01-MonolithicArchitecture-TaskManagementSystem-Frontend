import { type ComponentProps } from 'react';

import { cn } from '@/utils/cn';

export interface SwitchProps extends Omit<
  ComponentProps<'button'>,
  'onChange' | 'role' | 'aria-checked'
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * An on/off switch. role="switch" + aria-checked tells screen readers it is a toggle
 * ("on"/"off") rather than a button. Label it with aria-label or aria-labelledby.
 */
export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        onCheckedChange(!checked);
      }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-border',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
