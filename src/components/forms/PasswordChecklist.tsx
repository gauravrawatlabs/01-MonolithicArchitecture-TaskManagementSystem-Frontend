import { Check, Circle } from 'lucide-react';

import { PASSWORD_RULES } from '@/schemas/common';
import { cn } from '@/utils/cn';

/**
 * Live password requirements. Each item says "met"/"not met" in text (not only a green tick), and
 * the list is used as the password field's description, so screen readers read it on focus.
 * It is deliberately NOT a live region: announcing on every keystroke would be noise.
 */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-1 grid gap-1 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              met ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {met ? (
              <Check aria-hidden="true" className="size-3.5 shrink-0" />
            ) : (
              <Circle aria-hidden="true" className="size-3 shrink-0" />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
