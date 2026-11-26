import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import { useBreadcrumbs } from './useBreadcrumbs';

/**
 * Breadcrumb trail. A <nav> landmark with an ordered list; the current page is plain text with
 * aria-current="page" (linking to the page you're on is pointless).
 */
export function Breadcrumbs() {
  const crumbs = useBreadcrumbs();
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.to} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              ) : null}
              {isLast ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="truncate text-muted-foreground hover:text-foreground hover:underline"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
