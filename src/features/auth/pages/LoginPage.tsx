import { Link } from 'react-router';

import { Button } from '@/components/common/Button';
import { paths } from '@/constants/routes';

import { AuthPagePlaceholder } from '../components/AuthPagePlaceholder';
import { useAuth } from '../useAuth';
import { type PreviewAccount } from '../previewUsers';

const PREVIEW_ACCOUNTS: { account: PreviewAccount; label: string }[] = [
  { account: 'admin', label: 'Admin' },
  { account: 'manager', label: 'Manager' },
  { account: 'user', label: 'User' },
  { account: 'unverified', label: 'User (email not verified)' },
];

/**
 * Placeholder login. In development builds it offers TEMPORARY preview accounts so the layout and
 * role-based navigation can be explored; RequireGuest then redirects to the returnUrl.
 */
export function LoginPage() {
  const { previewSignIn } = useAuth();

  return (
    <AuthPagePlaceholder title="Welcome back" description="Sign in to your workspace.">
      {/* import.meta.env.DEV is a build-time constant: the whole panel is removed from production bundles. */}
      {import.meta.env.DEV && previewSignIn ? (
        <section
          aria-labelledby="preview-heading"
          className="mt-6 rounded-xl border border-dashed p-4"
        >
          <h2 id="preview-heading" className="text-sm font-semibold">
            Development preview
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Temporary until Phase 7. No API call is made and nothing is stored: reloading signs you
            out.
          </p>
          <div className="mt-3 grid gap-2">
            {PREVIEW_ACCOUNTS.map(({ account, label }) => (
              <Button
                key={account}
                variant="secondary"
                onClick={() => {
                  previewSignIn(account);
                }}
              >
                Continue as {label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
      <p className="mt-6 text-sm text-muted-foreground">
        No account?{' '}
        <Link to={paths.register} className="font-medium text-primary-text hover:underline">
          Create one
        </Link>
      </p>
    </AuthPagePlaceholder>
  );
}
