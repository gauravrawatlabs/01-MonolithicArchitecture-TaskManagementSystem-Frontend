import { useSearchParams } from 'react-router';

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

/** /tasks and /tasks?assignedToMe=true ("My tasks") share this page; filters live in the URL. */
export function TasksPage() {
  const [searchParams] = useSearchParams();
  const mine = searchParams.get('assignedToMe') === 'true';

  return (
    <PagePlaceholder
      title={mine ? 'My tasks' : 'All tasks'}
      description={mine ? 'Tasks assigned to you.' : 'Every task in the projects you can see.'}
      phase={11}
    />
  );
}
