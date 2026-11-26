import { Construction } from 'lucide-react';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/feedback/EmptyState';

/** Content of a project tab until its phase is built (the tab's h1 is the project name). */
export function ProjectTabPlaceholder({ section, phase }: { section: string; phase: number }) {
  return (
    <Card>
      <EmptyState
        icon={Construction}
        title={`${section} coming soon`}
        description={`This tab is built in Phase ${phase}.`}
      />
    </Card>
  );
}
