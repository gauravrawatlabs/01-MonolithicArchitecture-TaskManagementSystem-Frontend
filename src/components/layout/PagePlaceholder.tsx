import { Construction } from 'lucide-react';
import { type ReactNode } from 'react';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/feedback/EmptyState';

import { PageHeader } from './PageHeader';

export interface PagePlaceholderProps {
  title: string;
  description?: string;
  /** The implementation phase that builds this page. */
  phase: number;
  children?: ReactNode;
}

/** Temporary content for routes whose feature is built in a later phase. */
export function PagePlaceholder({ title, description, phase, children }: PagePlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState
          icon={Construction}
          title="Coming soon"
          description={`This page is built in Phase ${phase}. The route, layout and permissions are already in place.`}
          action={children}
        />
      </Card>
    </>
  );
}
