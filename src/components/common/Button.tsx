import { type ComponentProps, type ReactNode } from 'react';

import { buttonVariants, type ButtonSize, type ButtonVariant } from './Button.styles';
import { Spinner } from './Spinner';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets aria-busy (prevents double submits). */
  isLoading?: boolean;
  /** Icon shown before the text (hidden while loading). */
  leftIcon?: ReactNode;
}

export function Button({
  variant,
  size,
  isLoading = false,
  leftIcon,
  disabled,
  className,
  children,
  type = 'button', // never submit a form by accident
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      // Not `disabled ?? isLoading`: false ?? true is false, so a loading button would stay clickable.
      disabled={(disabled ?? false) || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {isLoading ? <Spinner label={null} /> : leftIcon}
      {children}
    </button>
  );
}
