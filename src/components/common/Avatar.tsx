import { getAvatarColor, getInitials } from '@/utils/avatar';
import { cn } from '@/utils/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const sizes: Record<AvatarSize, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
};

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
  /**
   * Hide from assistive technology when the name is already given next to it (or by a parent's
   * label). Prevents screen readers announcing the same name twice.
   */
  decorative?: boolean;
}

/**
 * Initials avatar (the backend has no profile photos). The colour is derived from the name,
 * so the same person always looks the same. The full name is exposed to assistive technology.
 */
export function Avatar({ name, size = 'sm', className, decorative = false }: AvatarProps) {
  return (
    <span
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name, title: name })}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        sizes[size],
        getAvatarColor(name),
        className,
      )}
    >
      <span aria-hidden="true">{getInitials(name)}</span>
    </span>
  );
}

export interface AvatarGroupProps {
  names: readonly string[];
  /** How many avatars to show before "+N". */
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ names, max = 3, size = 'sm' }: AvatarGroupProps) {
  const visible = names.slice(0, max);
  const hidden = names.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((name, index) => (
        <Avatar key={`${name}-${index}`} name={name} size={size} className="ring-2 ring-surface" />
      ))}
      {hidden > 0 ? (
        <span
          role="img"
          aria-label={`${hidden} more`}
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-surface-muted font-semibold text-muted-foreground ring-2 ring-surface',
            sizes[size],
          )}
        >
          <span aria-hidden="true">+{hidden}</span>
        </span>
      ) : null}
    </div>
  );
}
