import { isAdmin } from '@/features/auth';
import { type ProjectDetails, type ProjectSummary, type UserProfile } from '@/types/api';

/**
 * Who may edit, delete and manage members (backend ProjectAuthorizationHandler): the OWNER or an Admin.
 * (No email-verification requirement on these endpoints.) UX only: the API decides.
 */
export function canManageProject(
  user: UserProfile | null,
  project: Pick<ProjectSummary, 'ownerId'>,
): boolean {
  return user !== null && (isAdmin(user) || project.ownerId === user.id);
}

export type ProjectTimeline = 'upcoming' | 'active' | 'ended' | 'unscheduled';

/** Today as "yyyy-MM-dd" in the reader's time zone (project dates are calendar dates, not instants). */
export function localToday(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Derived from the project's dates (the backend has no project status). "yyyy-MM-dd" strings compare
 * correctly as text, so no Date parsing (and no time-zone surprises) is needed.
 */
export function projectTimeline(
  project: Pick<ProjectDetails, 'startDate' | 'endDate'>,
  today: string = localToday(),
): ProjectTimeline {
  const { startDate, endDate } = project;
  if (!startDate && !endDate) return 'unscheduled';
  if (startDate && today < startDate) return 'upcoming';
  if (endDate && today > endDate) return 'ended';
  return 'active';
}

/** "1 Mar 2026 – 15 Mar 2026", "From 1 Mar 2026", "Until …", or null. Dates shown as calendar dates. */
export function formatProjectDates(
  project: Pick<ProjectDetails, 'startDate' | 'endDate'>,
  locale?: string,
): string | null {
  const format = (date: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );
  const { startDate, endDate } = project;
  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  if (startDate) return `From ${format(startDate)}`;
  if (endDate) return `Until ${format(endDate)}`;
  return null;
}

/**
 * Same formula as the backend's ProjectProgress.CompletionPercent: cancelled tasks don't count (they will
 * never be done), so 3 done + 1 cancelled out of 4 is 100 %. Rounded to one decimal, 0 when nothing counts.
 */
export function completionPercent(total: number, done: number, cancelled: number): number {
  const relevant = total - cancelled;
  return relevant <= 0 ? 0 : Math.round((1000 * done) / relevant) / 10;
}
