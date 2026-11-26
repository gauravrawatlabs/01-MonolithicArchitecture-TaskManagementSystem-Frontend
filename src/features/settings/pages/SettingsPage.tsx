import { Navigate, useParams } from 'react-router';

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
import { TabNav } from '@/components/layout/TabNav';
import { paths, SETTINGS_TABS, type SettingsTab } from '@/constants/routes';

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

  return (
    <>
      <TabNav
        label="Settings sections"
        items={SETTINGS_TABS.map((value) => ({
          label: TAB_LABELS[value],
          to: paths.settings(value),
        }))}
      />
      <PagePlaceholder
        title={`Settings · ${TAB_LABELS[tab]}`}
        description="Account, security, appearance and device preferences."
        phase={14}
      />
    </>
  );
}
