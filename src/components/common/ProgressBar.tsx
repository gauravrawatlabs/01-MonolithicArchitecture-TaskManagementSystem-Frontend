import { cn } from '@/utils/cn';

export interface ProgressBarProps {
  /** 0–100; values outside the range are clamped. */
  value: number;
  /** Accessible name, e.g. "Website Redesign progress". */
  label: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({ value, label, showValue = false, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const display = `${Math.round(percent * 10) / 10}%`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={display}
        className="h-2 flex-1 overflow-hidden rounded-full bg-primary-soft"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue ? (
        <span className="w-12 text-right text-xs font-medium text-muted-foreground">{display}</span>
      ) : null}
    </div>
  );
}
