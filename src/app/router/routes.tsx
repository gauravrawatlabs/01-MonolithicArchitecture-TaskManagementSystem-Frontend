import { type ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router';

import { PageLoader } from '@/components/feedback/PageLoader';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { paths, type SettingsTab } from '@/constants/routes';
import { type RouteHandle } from '@/types/routing';

import { AppLayout } from '../layouts/AppLayout';
import { RootLayout } from '../layouts/RootLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequireGuest } from './guards/RequireGuest';
import { RequireRole } from './guards/RequireRole';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

/**
 * Code splitting: the page's module is downloaded the first time the route is visited.
 * `pick` selects the named export, e.g. (m) => m.TasksPage.
 */
function lazyPage<TModule>(
  load: () => Promise<TModule>,
  pick: (module: TModule) => ComponentType,
): Pick<RouteObject, 'lazy'> {
  return { lazy: { Component: async () => pick(await load()) } };
}

const handle = (value: RouteHandle): RouteHandle => value;

const capitalize = (value: string | undefined) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';

/**
 * Development-only routes; `import.meta.env.DEV` is false in production builds, so they are removed.
 * The style guide is standalone (no sign-in, no app shell): it has no data and the E2E
 * accessibility scans open it directly.
 */
const developmentRoutes = (): RouteObject[] =>
  import.meta.env.DEV
    ? [
        {
          path: 'design-system',
          handle: handle({ title: 'Design system' }),
          ...lazyPage(
            () => import('@/features/design-system/pages/DesignSystemPage'),
            (m) => m.DesignSystemPage,
          ),
        },
      ]
    : [];

/**
 * Builds the route tree (docs/02 §4.2).
 *
 * A FACTORY, not a shared constant: React Router writes resolved lazy components onto the route
 * objects it receives, so two routers (e.g. two tests) must never share the same objects.
 * Layout routes (no path) wrap their children:
 *   RootLayout      → page titles, scroll restoration
 *   RequireGuest    → logged-out pages; signed-in users are sent on
 *   RequireAuth     → signed-in pages; others go to /login?returnUrl=…
 *   AppLayout       → sidebar + top bar
 *   errorElement    → on a pathless route INSIDE AppLayout, so a crashing page keeps the shell
 *   RequireRole     → Admin-only pages (others see /forbidden)
 */
export function createAppRoutes(): RouteObject[] {
  return [
    {
      element: <RootLayout />,
      hydrateFallbackElement: <PageLoader />,
      errorElement: <RouteErrorPage />,
      children: [
        { index: true, element: <Navigate to={paths.dashboard} replace /> },

        {
          element: <RequireGuest />,
          children: [
            {
              element: <AuthLayout />,
              children: [
                {
                  path: 'login',
                  handle: handle({ title: 'Sign in' }),
                  ...lazyPage(
                    () => import('@/features/auth/pages/LoginPage'),
                    (m) => m.LoginPage,
                  ),
                },
                {
                  path: 'register',
                  handle: handle({ title: 'Create account' }),
                  ...lazyPage(
                    () => import('@/features/auth/pages/RegisterPage'),
                    (m) => m.RegisterPage,
                  ),
                },
                {
                  path: 'register/success',
                  handle: handle({ title: 'Check your email' }),
                  ...lazyPage(
                    () => import('@/features/auth/pages/RegisterSuccessPage'),
                    (m) => m.RegisterSuccessPage,
                  ),
                },
                {
                  path: 'forgot-password',
                  handle: handle({ title: 'Forgot password' }),
                  ...lazyPage(
                    () => import('@/features/auth/pages/ForgotPasswordPage'),
                    (m) => m.ForgotPasswordPage,
                  ),
                },
                {
                  path: 'reset-password', // fixed by the backend's reset email link
                  handle: handle({ title: 'Reset password' }),
                  ...lazyPage(
                    () => import('@/features/auth/pages/ResetPasswordPage'),
                    (m) => m.ResetPasswordPage,
                  ),
                },
              ],
            },
          ],
        },

        // Works signed in OR out (the link is opened from an email).
        {
          element: <AuthLayout />,
          children: [
            {
              path: 'confirm-email', // fixed by the backend's confirmation email link
              handle: handle({ title: 'Confirm email' }),
              ...lazyPage(
                () => import('@/features/auth/pages/ConfirmEmailPage'),
                (m) => m.ConfirmEmailPage,
              ),
            },
          ],
        },

        {
          element: <RequireAuth />,
          children: [
            {
              element: <AppLayout />,
              children: [
                {
                  errorElement: <RouteErrorPage />,
                  children: [
                    {
                      path: 'dashboard',
                      handle: handle({ breadcrumb: 'Dashboard' }),
                      ...lazyPage(
                        () => import('@/features/dashboard/pages/DashboardPage'),
                        (m) => m.DashboardPage,
                      ),
                    },
                    {
                      path: 'tasks',
                      handle: handle({ breadcrumb: 'Tasks' }),
                      children: [
                        {
                          index: true,
                          ...lazyPage(
                            () => import('@/features/tasks/pages/TasksPage'),
                            (m) => m.TasksPage,
                          ),
                        },
                        {
                          path: ':taskId',
                          handle: handle({ breadcrumb: (p) => `Task #${p.taskId ?? ''}` }),
                          ...lazyPage(
                            () => import('@/features/tasks/pages/TaskDetailsPage'),
                            (m) => m.TaskDetailsPage,
                          ),
                        },
                      ],
                    },
                    {
                      path: 'board',
                      handle: handle({ breadcrumb: 'Board' }),
                      ...lazyPage(
                        () => import('@/features/board/pages/BoardPage'),
                        (m) => m.BoardPage,
                      ),
                    },
                    {
                      path: 'projects',
                      handle: handle({ breadcrumb: 'Projects' }),
                      children: [
                        {
                          index: true,
                          ...lazyPage(
                            () => import('@/features/projects/pages/ProjectsPage'),
                            (m) => m.ProjectsPage,
                          ),
                        },
                        {
                          path: ':projectId',
                          handle: handle({ breadcrumb: (p) => `Project #${p.projectId ?? ''}` }),
                          ...lazyPage(
                            () => import('@/features/projects/pages/ProjectDetailsLayout'),
                            (m) => m.ProjectDetailsLayout,
                          ),
                          children: [
                            {
                              index: true,
                              ...lazyPage(
                                () => import('@/features/projects/pages/ProjectOverviewPage'),
                                (m) => m.ProjectOverviewPage,
                              ),
                            },
                            {
                              path: 'tasks',
                              handle: handle({ breadcrumb: 'Tasks' }),
                              ...lazyPage(
                                () => import('@/features/tasks/pages/ProjectTasksPage'),
                                (m) => m.ProjectTasksPage,
                              ),
                            },
                            {
                              path: 'board',
                              handle: handle({ breadcrumb: 'Board' }),
                              ...lazyPage(
                                () => import('@/features/projects/pages/ProjectBoardPage'),
                                (m) => m.ProjectBoardPage,
                              ),
                            },
                            {
                              path: 'members',
                              handle: handle({ breadcrumb: 'Members' }),
                              ...lazyPage(
                                () => import('@/features/projects/pages/ProjectMembersPage'),
                                (m) => m.ProjectMembersPage,
                              ),
                            },
                          ],
                        },
                      ],
                    },
                    {
                      path: 'categories',
                      handle: handle({ breadcrumb: 'Categories' }),
                      ...lazyPage(
                        () => import('@/features/categories/pages/CategoriesPage'),
                        (m) => m.CategoriesPage,
                      ),
                    },
                    {
                      path: 'team',
                      handle: handle({ breadcrumb: 'Team' }),
                      children: [
                        {
                          index: true,
                          ...lazyPage(
                            () => import('@/features/team/pages/TeamPage'),
                            (m) => m.TeamPage,
                          ),
                        },
                        {
                          path: ':userId',
                          handle: handle({ breadcrumb: 'Member' }),
                          ...lazyPage(
                            () => import('@/features/team/pages/TeamMemberPage'),
                            (m) => m.TeamMemberPage,
                          ),
                        },
                      ],
                    },
                    {
                      path: 'profile',
                      handle: handle({ breadcrumb: 'Profile' }),
                      ...lazyPage(
                        () => import('@/features/users/pages/ProfilePage'),
                        (m) => m.ProfilePage,
                      ),
                    },
                    {
                      path: 'settings',
                      handle: handle({ breadcrumb: 'Settings' }),
                      children: [
                        {
                          index: true,
                          element: (
                            <Navigate
                              to={paths.settings('account' satisfies SettingsTab)}
                              replace
                            />
                          ),
                        },
                        {
                          path: ':tab',
                          handle: handle({ breadcrumb: (p) => capitalize(p.tab) }),
                          ...lazyPage(
                            () => import('@/features/settings/pages/SettingsPage'),
                            (m) => m.SettingsPage,
                          ),
                        },
                      ],
                    },
                    {
                      element: <RequireRole roles={['Admin']} />,
                      children: [
                        {
                          path: 'admin',
                          handle: handle({ breadcrumb: 'Admin' }),
                          children: [
                            {
                              index: true,
                              ...lazyPage(
                                () => import('@/features/admin/pages/AdminPage'),
                                (m) => m.AdminPage,
                              ),
                            },
                            {
                              path: 'users',
                              handle: handle({ breadcrumb: 'Users' }),
                              children: [
                                {
                                  index: true,
                                  ...lazyPage(
                                    () => import('@/features/users/pages/AdminUsersPage'),
                                    (m) => m.AdminUsersPage,
                                  ),
                                },
                                {
                                  path: ':userId',
                                  handle: handle({ breadcrumb: 'User details' }),
                                  ...lazyPage(
                                    () => import('@/features/users/pages/AdminUserDetailsPage'),
                                    (m) => m.AdminUserDetailsPage,
                                  ),
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      path: 'forbidden',
                      handle: handle({ breadcrumb: 'Access denied' }),
                      element: <ForbiddenPage />,
                    },
                  ],
                },
              ],
            },
          ],
        },

        ...developmentRoutes(),

        { path: '*', handle: handle({ title: 'Page not found' }), element: <NotFoundPage /> },
      ],
    },
  ];
}
