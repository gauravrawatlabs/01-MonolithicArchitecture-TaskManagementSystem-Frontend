import { CircleCheckBig } from 'lucide-react';
import { Outlet } from 'react-router';

import { ThemeToggle } from '@/components/common/ThemeToggle';
import { env } from '@/constants/env';

/**
 * Layout for logged-out pages (Phase 1 §10): form on the left, brand panel on the right
 * (desktop only). Pages render into the <Outlet/>.
 */
export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-base font-semibold">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CircleCheckBig aria-hidden="true" className="size-5" />
            </span>
            {env.appName}
          </span>
          <ThemeToggle />
        </div>
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10"
        >
          <Outlet />
        </main>
      </div>
      <aside
        aria-hidden="true"
        className="hidden flex-col justify-end bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-12 text-white lg:flex"
      >
        <p className="text-3xl font-semibold leading-tight">
          Plan projects, track tasks, ship together.
        </p>
        <p className="mt-3 max-w-md text-violet-100">
          Kanban boards, deadlines and team workload in one place, backed by a secure ASP.NET Core
          API.
        </p>
      </aside>
    </div>
  );
}
