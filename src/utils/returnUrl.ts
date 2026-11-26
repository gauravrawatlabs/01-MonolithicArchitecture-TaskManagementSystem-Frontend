/**
 * Accepts a returnUrl from the query string only if it is a path INSIDE this app.
 *
 * Why: /login?returnUrl=https://evil.example would otherwise send a freshly logged-in user to an
 * attacker's look-alike site (an "open redirect"). Protocol-relative URLs (//evil.example) and
 * backslash tricks (/\evil.example, which some browsers treat as //) are rejected too.
 */
export function getSafeReturnUrl(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const isAppPath = value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');
  return isAppPath ? value : fallback;
}
