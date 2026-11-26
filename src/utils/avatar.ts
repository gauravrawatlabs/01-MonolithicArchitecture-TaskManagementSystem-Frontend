/** "Jane Doe" → "JD", "jane" → "J", "  " → "?". Uses the first letter of the first and last word. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) {
    return '?';
  }
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return `${first.charAt(0)}${last ? last.charAt(0) : ''}`.toUpperCase();
}

/**
 * Background/text pairs for initials avatars. Every pair meets 4.5:1 contrast in light and dark mode.
 * Classes are written out in full so Tailwind can find them when scanning the source.
 */
export const AVATAR_COLORS = [
  'bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/25 dark:text-emerald-200',
  'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200',
  'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/25 dark:text-cyan-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/25 dark:text-fuchsia-200',
  'bg-orange-100 text-orange-900 dark:bg-orange-500/25 dark:text-orange-200',
] as const;

/**
 * The same name always gets the same colour (a simple, stable string hash), so a person is
 * recognisable across the app without storing anything.
 */
export function getAvatarColor(seed: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}
