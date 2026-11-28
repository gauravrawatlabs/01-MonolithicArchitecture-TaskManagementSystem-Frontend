import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { usePreferences } from '@/contexts/preferences';
import { useTheme } from '@/contexts/theme';
import { type MotionPreference } from '@/services/devicePreferences';
import { type ThemePreference } from '@/services/preferencesStorage';

import { ChoiceGroup } from './ChoiceGroup';

/** Settings › Appearance: colour theme and motion (both stored on this device). */
export function AppearanceSettings() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const { preferences, setPreference: setDevicePreference } = usePreferences();

  return (
    <Card>
      <CardHeader title="Appearance" description="Saved on this device." />
      <CardContent className="grid gap-8">
        <ChoiceGroup<ThemePreference>
          legend="Theme"
          value={preference}
          onChange={setPreference}
          choices={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            {
              value: 'system',
              label: 'System',
              description: `Follows your device (now ${resolvedTheme}).`,
            },
          ]}
        />
        <ChoiceGroup<MotionPreference>
          legend="Motion"
          description="Animations such as sliding panels and fading notifications."
          value={preferences.motion}
          onChange={(value) => {
            setDevicePreference('motion', value);
          }}
          choices={[
            {
              value: 'system',
              label: 'Follow my device',
              description: 'Reduced if your device asks for it.',
            },
            {
              value: 'reduce',
              label: 'Reduce motion',
              description: 'Turn animations off in this app.',
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
