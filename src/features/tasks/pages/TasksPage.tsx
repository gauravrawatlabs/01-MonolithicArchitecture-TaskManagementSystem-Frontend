import { useSearchParams } from 'react-router';

import { PageHeader } from '@/components/layout/PageHeader';

import { TaskList } from '../components/TaskList';

/** /tasks ("All tasks") and /tasks?assignedToMe=true ("My tasks") share this page; filters live in the URL. */
export function TasksPage() {
  const [searchParams] = useSearchParams();
  const mine = searchParams.get('assignedToMe') === 'true';

  return (
    <>
      <PageHeader
        title={mine ? 'My tasks' : 'All tasks'}
        description={mine ? 'Tasks assigned to you.' : 'Every task in the projects you can see.'}
      />
      <TaskList
        emptyDescription={
          mine
            ? 'Nothing is assigned to you right now.'
            : 'Tasks appear here once they are created in your projects.'
        }
      />
    </>
  );
}
