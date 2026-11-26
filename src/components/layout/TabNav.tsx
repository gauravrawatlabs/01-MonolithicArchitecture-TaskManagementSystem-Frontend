import { NavLink } from 'react-router';

import { cn } from '@/utils/cn';

export interface TabNavItem {
  label: string;
  to: string;
  /** Only match the exact path (needed for an "Overview" index tab). */
  end?: boolean;
}

/**
 * Tabs that are LINKS (each tab has its own URL, so Back/refresh/sharing work), styled like the
 * Tabs component. Uses aria-current="page" instead of the tab role, which would promise
 * arrow-key behaviour that links don't have.
 */
export function TabNav({ items, label }: { items: readonly TabNavItem[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-6 flex items-center gap-1 overflow-x-auto border-b">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              '-mb-px inline-flex items-center border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
