/** One-time messages shown on the sign-in page after a redirect (passed in router state). */
export type LoginNotice =
  | 'passwordReset'
  | 'passwordChanged'
  | 'sessionExpired'
  | 'signedOutElsewhere'
  | 'signedOutEverywhere';

const LOGIN_NOTICES: readonly LoginNotice[] = [
  'passwordReset',
  'passwordChanged',
  'sessionExpired',
  'signedOutElsewhere',
  'signedOutEverywhere',
];

export interface LoginLocationState {
  notice?: LoginNotice;
}

export interface RegisterSuccessLocationState {
  email?: string;
}

/** Router state is `unknown` (anyone can push anything into history): read it defensively. */
export function readLoginNotice(state: unknown): LoginNotice | undefined {
  if (typeof state !== 'object' || state === null || !('notice' in state)) return undefined;
  const { notice } = state;
  return LOGIN_NOTICES.find((value) => value === notice);
}

export function readRegisteredEmail(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('email' in state)) return undefined;
  const { email } = state;
  return typeof email === 'string' && email.includes('@') ? email : undefined;
}
