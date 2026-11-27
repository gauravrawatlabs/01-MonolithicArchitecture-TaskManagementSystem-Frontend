/**
 * Date helpers (docs/02 §9): the API speaks UTC ISO strings; people read their LOCAL time.
 * Native Intl only, so there's no date library in the bundle. Every function takes `now` (and the
 * locale) as parameters, which keeps them pure and testable.
 */
const DAY_MS = 86_400_000;

/** Local midnight of the given date: the start of "that day" for the reader. */
function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days from `now` to `date` in the reader's time zone (negative = past). */
export function calendarDaysBetween(now: Date, date: Date): number {
  return Math.round((startOfLocalDay(date) - startOfLocalDay(now)) / DAY_MS);
}

/** "Today", "Tomorrow", "Yesterday", "in 3 days", "5 days ago" (calendar days, local time). */
export function formatRelativeDay(isoUtc: string, now: Date = new Date(), locale?: string): string {
  const days = calendarDaysBetween(now, new Date(isoUtc));
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return capitalize(relative.format(days, 'day'));
}

/** "2 minutes ago", "3 hours ago", "yesterday": for "updated …" timestamps. */
export function formatTimeAgo(isoUtc: string, now: Date = new Date(), locale?: string): string {
  const seconds = Math.round((new Date(isoUtc).getTime() - now.getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour');
  return relative.format(Math.round(seconds / 86_400), 'day');
}

/** "28 Nov 2026, 17:00" in the reader's locale and time zone. */
export function formatDateTime(isoUtc: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(isoUtc),
  );
}

/** Adds days to a date (for query windows such as "the next 7 days"). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
