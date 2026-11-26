import { type ComponentProps, type ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { buttonVariants, type ButtonVariant } from './Button.styles';

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'aria-label' | 'children'> {
  /** Required: an icon has no text, so this is what screen readers announce. */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={buttonVariants({
        variant,
        className: cn('px-0', size === 'sm' ? 'size-8' : 'size-10', className),
      })}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  );
}
