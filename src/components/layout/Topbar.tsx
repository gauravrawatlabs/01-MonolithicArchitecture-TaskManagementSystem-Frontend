import { Menu } from 'lucide-react';
import { type ReactNode } from 'react';

import { IconButton } from '@/components/common/IconButton';

import { Breadcrumbs } from './Breadcrumbs';

export interface TopbarProps {
  /** Shown below md: opens the navigation drawer. */
  onOpenNavigation: () => void;
  /** Right-hand controls (theme toggle, user menu). */
  actions?: ReactNode;
}

export function Topbar({ onOpenNavigation, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur sm:px-6">
      <IconButton
        label="Open navigation"
        icon={<Menu />}
        onClick={onOpenNavigation}
        className="md:hidden"
      />
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
