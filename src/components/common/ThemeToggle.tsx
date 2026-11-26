import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/contexts/theme';
import { type ThemePreference } from '@/services/preferencesStorage';
import { cn } from '@/utils/cn';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Three-way theme switch (light / dark / follow the OS): a group of toggle buttons where the
 * active one has aria-pressed="true". (role="radiogroup" would promise arrow-key navigation,
 * which plain buttons don't provide.) Used in the topbar and in Settings > Appearance.
 */
export function ThemeToggle({ showLabels = false }: { showLabels?: boolean }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-lg border bg-surface-muted p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            aria-label={showLabels ? undefined : label}
            title={label}
            onClick={() => {
              setPreference(value);
            }}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
              selected
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {showLabels ? label : null}
          </button>
        );
      })}
    </div>
  );
}
