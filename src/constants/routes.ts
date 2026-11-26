/**
 * Every URL in the app, in one place. Features build links with these helpers instead of
 * hand-writing strings, so a renamed route is a one-line change and typos are compile errors.
 *
 * Lives in constants/ (not app/router) because features need it and must not import from app/.
 * Two paths are FIXED by the backend's email links: /confirm-email and /reset-password.
 */
export const SETTINGS_TABS = ['account', 'security', 'appearance', 'preferences'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const paths = {
  root: '/',

  // Public (logged-out) pages
  login: '/login',
  register: '/register',
  registerSuccess: '/register/success',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  confirmEmail: '/confirm-email',

  // Workspace
  dashboard: '/dashboard',
  tasks: '/tasks',
  myTasks: '/tasks?assignedToMe=true',
  task: (taskId: number) => `/tasks/${taskId}`,
  board: '/board',
  projects: '/projects',
  project: (projectId: number) => `/projects/${projectId}`,
  projectTasks: (projectId: number) => `/projects/${projectId}/tasks`,
  projectBoard: (projectId: number) => `/projects/${projectId}/board`,
  projectMembers: (projectId: number) => `/projects/${projectId}/members`,

  // Manage
  categories: '/categories',
  team: '/team',
  teamMember: (userId: string) => `/team/${userId}`,

  // Account
  profile: '/profile',
  settings: (tab: SettingsTab = 'account') => `/settings/${tab}`,

  // Admin
  admin: '/admin',
  adminUsers: '/admin/users',
  adminUser: (userId: string) => `/admin/users/${userId}`,

  // Other
  forbidden: '/forbidden',
  designSystem: '/design-system',
} as const;

/** /login?returnUrl=<path> — the page to come back to after signing in. */
export function loginWithReturnUrl(returnUrl: string): string {
  return `${paths.login}?${new URLSearchParams({ returnUrl }).toString()}`;
}
