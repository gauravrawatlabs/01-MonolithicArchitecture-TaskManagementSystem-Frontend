import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import { Input } from '@/components/common/Input';
import { cn } from '@/utils/cn';

/**
 * Password input with a show/hide button. The button is a real <button type="button"> with
 * aria-pressed, so it never submits the form and screen readers announce its state.
 */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        autoComplete="current-password"
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => {
          setVisible((value) => !value);
        }}
        className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}
