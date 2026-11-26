import {
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  type LucideIcon,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  UsersRound,
} from 'lucide-react';

import { type Role } from './roles';
import { paths } from './routes';

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Only these global roles see the item. Omit = every signed-in user. */
  roles?: readonly Role[];
  /**
   * Custom "current page" rule. Needed when two items share a path:
   * "My tasks" (/tasks?assignedToMe=true) and "All tasks" (/tasks).
   */
  isActive?: (location: { pathname: string; search: string }) => boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: readonly NavItem[];
}

const isMyTasks = (search: string) => new URLSearchParams(search).get('assignedToMe') === 'true';

/** Sidebar structure from Phase 1 §3. Visibility per role follows the matrix in Phase 1 §13. */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', to: paths.dashboard, icon: LayoutDashboard },
      {
        id: 'my-tasks',
        label: 'My tasks',
        to: paths.myTasks,
        icon: ListTodo,
        isActive: ({ pathname, search }) => pathname === paths.tasks && isMyTasks(search),
      },
      {
        id: 'all-tasks',
        label: 'All tasks',
        to: paths.tasks,
        icon: ListChecks,
        isActive: ({ pathname, search }) =>
          (pathname === paths.tasks && !isMyTasks(search)) ||
          pathname.startsWith(`${paths.tasks}/`),
      },
      { id: 'board', label: 'Board', to: paths.board, icon: KanbanSquare },
      { id: 'projects', label: 'Projects', to: paths.projects, icon: FolderKanban },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    items: [
      { id: 'categories', label: 'Categories', to: paths.categories, icon: Tags },
      { id: 'team', label: 'Team', to: paths.team, icon: UsersRound },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      {
        id: 'admin-overview',
        label: 'Overview',
        to: paths.admin,
        icon: ShieldCheck,
        roles: ['Admin'],
      },
      { id: 'admin-users', label: 'Users', to: paths.adminUsers, icon: Users, roles: ['Admin'] },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  id: 'settings',
  label: 'Settings',
  to: paths.settings(),
  icon: Settings,
  isActive: ({ pathname }) => pathname.startsWith('/settings'),
};
