/**
 * Due dates are INSTANTS (DateTime UTC in the API, e.g. "2026-12-01T17:00:00Z"), edited in the user's LOCAL
 * time with <input type="datetime-local"> ("2026-12-01T18:00", no zone). These helpers convert between the two.
 */

/** "yyyy-MM-ddTHH:mm" in local time → ISO UTC. Returns null for "" or an invalid value. */
export function localInputToUtc(value: string): string | null {
  if (!value) return null;
  const date = new Date(value); // a zone-less date-time string is parsed as LOCAL time
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO UTC → "yyyy-MM-ddTHH:mm" in local time (what datetime-local expects). */
export function utcToLocalInput(isoUtc: string | null | undefined): string {
  if (!isoUtc) return '';
  const date = new Date(isoUtc);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The backend compares the due date's **UTC calendar date** with the project's end date
 * (DateOnly.FromDateTime(dueUtc) > endDate → 422). Mirrored exactly, so the form can say why BEFORE sending,
 * including the surprising case: 23:30 local on the end date can already be the next day in UTC.
 */
export function isAfterProjectEnd(
  dueUtc: string,
  projectEndDate: string | null | undefined,
): boolean {
  return Boolean(projectEndDate) && dueUtc.slice(0, 10) > (projectEndDate ?? '');
}

/** Today 17:00 local, or tomorrow if that has passed: a sensible default when the user adds a due date. */
export function defaultDueInput(now: Date = new Date()): string {
  const due = new Date(now);
  due.setHours(17, 0, 0, 0);
  if (due <= now) due.setDate(due.getDate() + 1);
  return utcToLocalInput(due.toISOString());
}
