import { Navigate, useParams } from 'react-router';

import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabNav } from '@/components/layout/TabNav';
import { paths, SETTINGS_TABS, type SettingsTab } from '@/constants/routes';
import { ChangePasswordForm, SessionsCard } from '@/features/auth';

import { AccountSettings } from '../components/AccountSettings';
import { AppearanceSettings } from '../components/AppearanceSettings';
import { PreferenceSettings } from '../components/PreferenceSettings';

const TAB_LABELS: Record<SettingsTab, string> = {
  account: 'Account',
  security: 'Security',
  appearance: 'Appearance',
  preferences: 'Preferences',
};

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}

function SecuritySettings() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader
          title="Change password"
          description="Use a password you don't use anywhere else."
        />
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <SessionsCard />
    </div>
  );
}

const CONTENT: Record<SettingsTab, () => React.ReactNode> = {
  account: AccountSettings,
  security: SecuritySettings,
  appearance: AppearanceSettings,
  preferences: PreferenceSettings,
};

/** /settings/:tab (each tab its own URL). An unknown tab (typo, old link) redirects to the Account tab. */
export function SettingsPage() {
  const { tab } = useParams();
  if (!isSettingsTab(tab)) {
    return <Navigate to={paths.settings('account')} replace />;
  }
  const Content = CONTENT[tab];

  return (
    <>
      <PageHeader title={`Settings · ${TAB_LABELS[tab]}`} />
      <TabNav
        label="Settings sections"
        items={SETTINGS_TABS.map((value) => ({
          label: TAB_LABELS[value],
          to: paths.settings(value),
        }))}
      />
      <div className="max-w-3xl">
        <Content />
      </div>
    </>
  );
}
