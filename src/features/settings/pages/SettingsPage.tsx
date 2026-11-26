import { Navigate, useParams } from 'react-router';

import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
import { TabNav } from '@/components/layout/TabNav';
import { paths, SETTINGS_TABS, type SettingsTab } from '@/constants/routes';
import { ChangePasswordForm } from '@/features/auth';

const TAB_LABELS: Record<SettingsTab, string> = {
  account: 'Account',
  security: 'Security',
  appearance: 'Appearance',
  preferences: 'Preferences',
};

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}

/** /settings/:tab. An unknown tab (typo, old link) redirects to the Account tab. */
export function SettingsPage() {
  const { tab } = useParams();

  if (!isSettingsTab(tab)) {
    return <Navigate to={paths.settings('account')} replace />;
  }

  const tabs = (
    <TabNav
      label="Settings sections"
      items={SETTINGS_TABS.map((value) => ({
        label: TAB_LABELS[value],
        to: paths.settings(value),
      }))}
    />
  );

  // Security: change password (Phase 6). The other tabs are built in Phase 14.
  if (tab === 'security') {
    return (
      <>
        <PageHeader title="Settings · Security" description="Password and sign-in security." />
        {tabs}
        <Card>
          <CardHeader
            title="Change password"
            description="Use a password you don't use anywhere else."
          />
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {tabs}
      <PagePlaceholder
        title={`Settings · ${TAB_LABELS[tab]}`}
        description="Account, security, appearance and device preferences."
        phase={14}
      />
    </>
  );
}
