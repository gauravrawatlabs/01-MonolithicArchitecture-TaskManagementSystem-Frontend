import { ChevronsLeft, ChevronsRight, CircleCheckBig } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { Tooltip } from '@/components/common/Tooltip';
import { type NavItem, type NavSection } from '@/constants/navigation';
import { cn } from '@/utils/cn';

export interface SidebarProps {
  appName: string;
  /** Sections already filtered for the current user's roles. */
  sections: readonly NavSection[];
  footerItem: NavItem;
  /** Icon-only rail (collapsed desktop, or tablet width). */
  isRail: boolean;
  /** Shown only where collapsing is allowed (desktop). */
  onToggleCollapse?: () => void;
  /** Called after a link is chosen (closes the mobile drawer). */
  onNavigate?: () => void;
  /** User card at the bottom. */
  userSlot?: ReactNode;
}

function isItemActive(item: NavItem, location: { pathname: string; search: string }): boolean {
  if (item.isActive) return item.isActive(location);
  return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
}

/**
 * Main navigation. Presentational: it receives already role-filtered sections; the app layout
 * decides what the user may see. Active links get aria-current="page" so screen readers say
 * "current page", not just a different colour.
 */
export function Sidebar({
  appName,
  sections,
  footerItem,
  isRail,
  onToggleCollapse,
  onNavigate,
  userSlot,
}: SidebarProps) {
  const location = useLocation();

  const renderItem = (item: NavItem) => {
    const active = isItemActive(item, location);
    const Icon = item.icon;
    const link = (
      <Link
        to={item.to}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        aria-label={isRail ? item.label : undefined}
        className={cn(
          'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          isRail && 'justify-center px-0',
          active
            ? 'bg-primary-soft text-primary-soft-foreground'
            : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
        )}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        {isRail ? null : <span className="truncate">{item.label}</span>}
      </Link>
    );

    return (
      <li key={item.id}>
        {isRail ? (
          <Tooltip content={item.label} side="right">
            {link}
          </Tooltip>
        ) : (
          link
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2 px-4',
          isRail && 'justify-center px-0',
        )}
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CircleCheckBig aria-hidden="true" className="size-5" />
        </span>
        {isRail ? (
          <span className="sr-only">{appName}</span>
        ) : (
          <span className="truncate text-base font-semibold text-foreground">{appName}</span>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            {isRail ? (
              <h2 className="sr-only">{section.label}</h2>
            ) : (
              <h2 className="mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {section.label}
              </h2>
            )}
            <ul className="grid gap-0.5">{section.items.map(renderItem)}</ul>
          </div>
        ))}
      </nav>

      <div className="grid gap-1 border-t px-3 py-3">
        <ul>{renderItem(footerItem)}</ul>
        {userSlot}
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              isRail && 'justify-center px-0',
            )}
          >
            {isRail ? (
              <ChevronsRight aria-hidden="true" className="size-4" />
            ) : (
              <>
                <ChevronsLeft aria-hidden="true" className="size-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
