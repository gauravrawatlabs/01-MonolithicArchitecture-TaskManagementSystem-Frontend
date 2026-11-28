import { useId } from 'react';

import { Button } from '@/components/common/Button';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Select } from '@/components/common/Select';
import { usePreferences } from '@/contexts/preferences';
import { useToast } from '@/contexts/toast';
import { PAGE_SIZE_OPTIONS, type ToastDuration } from '@/services/devicePreferences';

import { ChoiceGroup } from './ChoiceGroup';

/**
 * Settings › Preferences: device-level choices (Phase 1 gap G4). The app has no server-side notifications or
 * user settings, so these live in this browser only, and the page says so.
 */
export function PreferenceSettings() {
  const { preferences, setPreference, resetPreferences } = usePreferences();
  const toast = useToast();
  const sizeId = useId();

  return (
    <Card>
      <CardHeader
        title="Preferences"
        description="Saved in this browser only: other devices and browsers keep their own."
      />
      <CardContent className="grid gap-8">
        <div className="grid max-w-xs gap-1.5">
          <label htmlFor={sizeId} className="text-sm font-semibold">
            Rows per page
          </label>
          <p className="text-sm text-muted-foreground">
            In task and user tables. A link that names a size still wins.
          </p>
          <Select
            id={sizeId}
            value={String(preferences.pageSize)}
            options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(event) => {
              setPreference(
                'pageSize',
                Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
              );
            }}
          />
        </div>

        <div className="grid gap-3">
          <ChoiceGroup<ToastDuration>
            legend="Notifications"
            description="How long messages such as “Task created” stay before closing. Errors always stay longer."
            value={preferences.toastDuration}
            onChange={(value) => {
              setPreference('toastDuration', value);
            }}
            choices={[
              { value: 'short', label: 'Short' },
              { value: 'normal', label: 'Normal' },
              { value: 'long', label: 'Long', description: 'More time to read' },
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => {
              toast.success('This is a sample notification', 'It closes after the time you chose.');
            }}
          >
            Show a sample notification
          </Button>
        </div>

        <div className="border-t pt-4">
          <Button
            variant="secondary"
            onClick={() => {
              resetPreferences();
              toast.info(
                'Preferences reset',
                'Rows per page, notifications and motion are back to their defaults.',
              );
            }}
          >
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
