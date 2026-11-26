import { ChevronDown } from 'lucide-react';
import { type ComponentProps } from 'react';

import { cn } from '@/utils/cn';

import { fieldClassName } from './Input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentProps<'select'>, 'children'> {
  options: readonly SelectOption[];
  /** Optional first option with an empty value, e.g. "All statuses". */
  placeholder?: string;
}

/**
 * A styled NATIVE <select>: fully accessible, uses the phone's own picker on mobile, and works
 * directly with React Hook Form's register(). (Radix Select is only worth it for rich options.)
 */
export function Select({ options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(fieldClassName, 'h-10 cursor-pointer appearance-none pr-9', className)}
        {...props}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
