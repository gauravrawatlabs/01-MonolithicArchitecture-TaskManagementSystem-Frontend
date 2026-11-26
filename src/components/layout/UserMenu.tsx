import { LogOut, Palette, Settings, UserRound } from 'lucide-react';
import { Link } from 'react-router';

import { Avatar } from '@/components/common/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/DropdownMenu';
import { paths } from '@/constants/routes';

export interface UserMenuProps {
  fullName: string;
  email: string;
  roles: readonly string[];
  onSignOut: () => void;
  /** Development builds only: link to the component library. */
  showDesignSystemLink?: boolean;
}

/** Avatar button in the top bar: profile, settings and sign out. */
export function UserMenu({
  fullName,
  email,
  roles,
  onSignOut,
  showDesignSystemLink = false,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      {/*
        Named by visually hidden TEXT, not aria-label: the visible initials are decorative, and an
        aria-label that doesn't contain the visible text fails WCAG 2.5.3 "Label in Name" (axe).
      */}
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full p-0.5 hover:bg-surface-muted">
        <Avatar name={fullName} size="sm" decorative />
        <span className="sr-only">Account menu for {fullName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold text-foreground">{fullName}</span>
          <span className="block truncate">{email}</span>
          <span className="mt-1 block">{roles.join(' · ')}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={paths.profile}>
            <UserRound aria-hidden="true" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={paths.settings()}>
            <Settings aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>
        {showDesignSystemLink ? (
          <DropdownMenuItem asChild>
            <Link to={paths.designSystem}>
              <Palette aria-hidden="true" /> Design system
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
