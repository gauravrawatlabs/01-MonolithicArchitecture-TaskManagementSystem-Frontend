import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigation } from 'react-router';

import { Avatar } from '@/components/common/Avatar';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Banner } from '@/components/feedback/Banner';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { Sidebar } from '@/components/layout/Sidebar';
import { SkipLink } from '@/components/layout/SkipLink';
import { Topbar } from '@/components/layout/Topbar';
import { UserMenu } from '@/components/layout/UserMenu';
import { env } from '@/constants/env';
import { NAV_SECTIONS, type NavSection, SETTINGS_NAV_ITEM } from '@/constants/navigation';
import { paths } from '@/constants/routes';
import { hasAnyRole, isEmailVerified, useAuth } from '@/features/auth';
import { DESKTOP_QUERY, TABLET_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { readSidebarCollapsed, writeSidebarCollapsed } from '@/services/preferencesStorage';
import { type UserProfile } from '@/types/api';
import { cn } from '@/utils/cn';

/** Removes items the user's roles don't allow, then empty sections (Phase 1 §13). */
function visibleSections(user: UserProfile | null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || hasAnyRole(user, item.roles)),
  })).filter((section) => section.items.length > 0);
}

/**
 * The signed-in shell (Phase 1 §4): sidebar + top bar + page content.
 *
 * Responsive behaviour (Phase 1 §12):
 *   < 768 px      sidebar hidden; the ☰ button opens it as a drawer
 *   768–1023 px   icon rail
 *   ≥ 1024 px     full sidebar; the user can collapse it to the rail (remembered)
 */
export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isTabletUp = useMediaQuery(TABLET_QUERY);
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sections = useMemo(() => visibleSections(user), [user]);
  const isRail = !isDesktop || collapsed;
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const handleToggleCollapse = () => {
    setCollapsed((value) => {
      writeSidebarCollapsed(!value);
      return !value;
    });
  };

  // RequireAuth navigates to the sign-in page when the session ends (single navigation source).
  const handleSignOut = () => {
    void signOut();
  };

  const userCard = (rail: boolean) =>
    user ? (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2',
          rail && 'justify-center px-0',
        )}
      >
        {/* In the rail the avatar is the only cue, so it keeps its name; otherwise the name is printed next to it. */}
        <Avatar name={fullName} size="sm" decorative={!rail} />
        {rail ? null : (
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-foreground">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.roles.join(' · ')}</p>
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="flex min-h-screen bg-background">
      <SkipLink />

      {/* Lazy-loaded pages: thin progress bar while the next page's code downloads. */}
      {navigation.state === 'loading' ? (
        <div
          role="progressbar"
          aria-label="Loading page"
          className="fixed inset-x-0 top-0 z-[60] h-0.5 animate-pulse bg-primary"
        />
      ) : null}

      {isTabletUp ? (
        <aside
          className={cn(
            'sticky top-0 h-screen shrink-0 border-r transition-[width] duration-200',
            isRail ? 'w-[72px]' : 'w-64',
          )}
        >
          <Sidebar
            appName={env.appName}
            sections={sections}
            footerItem={SETTINGS_NAV_ITEM}
            isRail={isRail}
            onToggleCollapse={isDesktop ? handleToggleCollapse : undefined}
            userSlot={userCard(isRail)}
          />
        </aside>
      ) : (
        <MobileNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Sidebar
            appName={env.appName}
            sections={sections}
            footerItem={SETTINGS_NAV_ITEM}
            isRail={false}
            onNavigate={() => {
              setDrawerOpen(false);
            }}
            userSlot={userCard(false)}
          />
        </MobileNavDrawer>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenNavigation={() => {
            setDrawerOpen(true);
          }}
          actions={
            <>
              <ThemeToggle />
              {user ? (
                <UserMenu
                  fullName={fullName}
                  email={user.email}
                  roles={user.roles}
                  onSignOut={handleSignOut}
                  showDesignSystemLink={import.meta.env.DEV}
                />
              ) : null}
            </>
          }
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          <div className="mx-auto w-full max-w-[1440px]">
            {user && !isEmailVerified(user) ? (
              <Banner
                variant="warning"
                title="Please verify your email address"
                className="mb-6"
                action={
                  pathname === paths.settings('account') ? null : (
                    <Link
                      to={paths.settings('account')}
                      className="font-medium underline underline-offset-2"
                    >
                      Resend the email
                    </Link>
                  )
                }
              >
                We sent a confirmation link to {user.email}. Until you confirm it, you can look
                around but not create or change anything.
              </Banner>
            ) : null}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
