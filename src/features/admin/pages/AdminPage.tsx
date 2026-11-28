import {
  ChevronRight,
  FolderKanban,
  ListChecks,
  ShieldCheck,
  Tags,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Link } from 'react-router';

import { StatCard } from '@/components/common/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { canAdministerUsers, useUsers, VerifyToAdminister } from '@/features/users';
import { type UserQuery } from '@/types/api';

/** Only the total is needed: PageSize=1 and read totalCount (one tiny request per figure). */
const COUNT = { Page: 1, PageSize: 1 } satisfies UserQuery;

/**
 * /admin: who has access, at a glance, and the places an Admin manages. Admins already see every project and
 * task in the normal pages, so this page links there instead of duplicating them (Phase 1 §20).
 */
export function AdminPage() {
  const { user } = useAuth();
  const allowed = canAdministerUsers(user);
  const all = useUsers(COUNT, { enabled: allowed });
  const active = useUsers({ ...COUNT, IsActive: true }, { enabled: allowed });
  const inactive = useUsers({ ...COUNT, IsActive: false }, { enabled: allowed });
  const admins = useUsers({ ...COUNT, Role: 'Admin' }, { enabled: allowed });

  if (!allowed) {
    return (
      <>
        <PageHeader title="Admin" description="System-wide administration." />
        <VerifyToAdminister />
      </>
    );
  }

  const links = [
    {
      to: paths.adminUsers,
      icon: Users,
      label: 'Users',
      hint: 'Roles, activation and deactivation',
    },
    {
      to: paths.projects,
      icon: FolderKanban,
      label: 'All projects',
      hint: 'As an Admin you see every project',
    },
    { to: paths.tasks, icon: ListChecks, label: 'All tasks', hint: 'Across every project' },
    {
      to: paths.categories,
      icon: Tags,
      label: 'Categories',
      hint: 'Labels shared by all projects',
    },
  ];

  return (
    <>
      <PageHeader title="Admin" description="System-wide administration." />
      <section aria-labelledby="admin-accounts" className="grid gap-4">
        <h2 id="admin-accounts" className="text-lg font-semibold">
          Accounts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="All users"
            value={all.data?.totalCount ?? 0}
            icon={Users}
            to={paths.adminUsers}
          />
          <StatCard
            label="Active"
            value={active.data?.totalCount ?? 0}
            icon={UserCheck}
            to={`${paths.adminUsers}?status=active`}
          />
          <StatCard
            label="Deactivated"
            value={inactive.data?.totalCount ?? 0}
            icon={UserX}
            to={`${paths.adminUsers}?status=inactive`}
            hint="Can't sign in"
          />
          <StatCard
            label="Admins"
            value={admins.data?.totalCount ?? 0}
            icon={ShieldCheck}
            to={`${paths.adminUsers}?role=Admin`}
          />
        </div>
      </section>
      <section aria-labelledby="admin-manage" className="mt-8 grid gap-4">
        <h2 id="admin-manage" className="text-lg font-semibold">
          Manage
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map(({ to, icon: Icon, label, hint }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-3 rounded-xl border bg-surface p-4 shadow-xs hover:border-primary"
              >
                <Icon aria-hidden="true" className="size-5 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
